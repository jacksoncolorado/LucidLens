// =================================================================================================
//  src/controllers/PrivacyDataController.js
// =================================================================================================
//
//  WHAT THIS CLASS IS (mental model):
//    PrivacyDataController = the “data manager” for ONE website session.
//    Background creates ONE instance of this per current URL.
//
//  WHO CALLS THIS?
//    background.js calls:
//      - new PrivacyDataController()
//      - initializeCollection(url)   when you visit/switch to a site
//      - stopMonitoring()           when you switch away from a site
//      - getCurrentPrivacyData()    when popup needs a snapshot
//      - addScriptDetails(list)     when content script reports tracking scripts
//      - setPrivacyPolicy(url)      when content script finds privacy policy link
//
//  WHO DOES THIS CLASS CALL?
//    - WebRequestService: listens to network activity & reports requestData events
//    - chrome.cookies API: pulls current cookies for the domain
//    - chrome.runtime.sendMessage: notifies background that data changed
//
//  IMPORTANT: This class does NOT talk to the popup directly.
//             It only sends "privacyData:updated" to background.js.
//             Then background.js computes the PrivacyScore and sends to popup.
//
// =================================================================================================

import { PrivacyData } from '../models/PrivacyData.js';
import { WebRequestService } from '../services/WebRequestService.js';
import PrivacyPolicyService from '../services/PrivacyPolicyService.js';
import { StorageService } from '../services/StorageService.js';
import { CONSTANTS } from '../utils/constants.js';
import { classifyScripts } from '../services/trackerClassifier.js';

export class PrivacyDataController {
    // ---------------------------------------------------------------------------------------------
    //  CONSTRUCTOR — create helper services, initialize state
    // ---------------------------------------------------------------------------------------------
    constructor() {
        // WebRequestService is the thing that “streams” network events to us.
        // It will call our listener function with requestData objects.
        this.webRequestService = new WebRequestService();

        // Not used in this file right now (may be used elsewhere or future feature).
        // Keeping it doesn't change behavior; it's just unused currently.
        this.privacyPolicyService = new PrivacyPolicyService();

        // Wrapper around chrome.storage (save/get).
        this.storageService = new StorageService();

        // Holds the live PrivacyData model for the CURRENT url.
        // We set this during initializeCollection(url).
        this.currentPrivacyData = null; // null = not initialized yet

        // We store the request listener reference so we can remove it later.
        this.requestListener = null; // null = no listener registered yet
    }

    /**
     * mergeScriptDetails(existing, incoming)
     * Purpose: combine script/network findings without duplicates.
     * Key dedupe: url + source (default "Script").
     */
    mergeScriptDetails(existing = [], incoming = []) {
        const map = new Map();
        const add = (item) => {
            if (!item || !item.url) return;
            const source = item.source || 'Script';
            // Aggressive dedupe for display: host-only to avoid repeated rows for the same tracker.
            const key = `${this.normalizeUrlKey(item.url, { hostOnly: true })}::${source}`;
            if (!map.has(key)) map.set(key, { ...item, source, url: item.url });
        };
        existing.forEach(add);
        incoming.forEach(add);
        return Array.from(map.values());
    }

    normalizeUrlKey(url, opts = {}) {
        try {
            const u = new URL(url);
            const host = u.hostname.toLowerCase();
            if (opts.hostOnly) {
                return host;
            }
            const path = u.pathname === '/' ? '/' : u.pathname.replace(/\/+$/,'/');
            if (opts.stripAllQuery) {
                return `${host}${path}`;
            }
            const cacheBusters = new Set([
                '_', 'cb', 'cache', 'cachebust', 'cache_bust', 'cacheBust',
                'ts', 't', 'v', 'rnd', 'rand', 'nocache', '_dc', '_cb', '_ts'
            ].map(p => p.toLowerCase()));

            const filtered = [];
            u.searchParams.forEach((value, key) => {
                if (!cacheBusters.has(key.toLowerCase())) {
                    filtered.push([key, value]);
                }
            });

            const query = filtered.length
                ? '?' + filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
                : '';

            return `${host}${path}${query}`;
        } catch {
            return url || '';
        }
    }

    /**
     * syncScriptCountsFromDetails()
     * Purpose: keep tracking.scripts aligned with scriptDetails for UI counts/score.
     */
    syncScriptCountsFromDetails() {
        if (!this.currentPrivacyData) return;
        const details = this.currentPrivacyData.tracking.scriptDetails || [];
        const dedup = new Set();
        const scripts = [];
        details.forEach((d) => {
            if (!d?.url) return;
            const key = d.url;
            if (dedup.has(key)) return;
            dedup.add(key);
            scripts.push({
                url: d.url,
                domain: d.domain,
                isThirdParty: d.isThirdParty,
                category: d.category,
                timestamp: Date.now(),
            });
        });
        this.currentPrivacyData.tracking.scripts = scripts;
    }

    // ---------------------------------------------------------------------------------------------
    //  PUBLIC API — used by background.js
    // ---------------------------------------------------------------------------------------------

    /**
     * initializeCollection(url)
     * Purpose: “Start a fresh monitoring session for this website.”
     *
     * Called by: background.js -> initializePrivacyCollection(url)
     *
     * Steps:
     *   1) Create a new PrivacyData model for this url
     *   2) Start network monitoring (WebRequestService)
     *   3) Collect current cookies via chrome.cookies
     *   4) Return the PrivacyData instance
     */
    async initializeCollection(url) {
        if (!url) return null; // null = caller passed nothing

        // Create new PrivacyData instance.
        // PrivacyData is your model that stores cookies, tracker scripts, requests, policy info, etc.
        this.currentPrivacyData = new PrivacyData(url);

        // Ensure this field exists (scriptDetails comes from content script).
        // Why "[]"?
        //   - empty list means “no details yet”
        //   - avoids undefined checks later in UI
        this.currentPrivacyData.tracking.scriptDetails = [];

        // Start monitoring network requests (web requests + cookies seen in headers, etc).
        this.startMonitoring();

        // Collect cookies that already exist for the domain (first party + parent domain).
        await this.collectCookies(url);

        return this.currentPrivacyData;
    }

    /**
     * addScriptDetails(list)
     * Purpose: accept detailed tracker script info found by content script.
     *
     * Called by: background.js when it receives "trackingScripts:detected".
     *
     * Why update + notify?
     *   - we want UI/score to refresh as soon as we learn new tracker details.
     */
    addScriptDetails(list) {
        if (!this.currentPrivacyData) return; // ignore if not initialized

        const existing = this.currentPrivacyData.tracking.scriptDetails || [];
        this.currentPrivacyData.tracking.scriptDetails = this.mergeScriptDetails(existing, list);
        this.syncScriptCountsFromDetails();

        // Tell background: “data changed.”
        this.notifyUpdate();
    }

    // ---------------------------------------------------------------------------------------------
    //  NETWORK MONITORING — WebRequestService events -> update PrivacyData model
    // ---------------------------------------------------------------------------------------------

    /**
     * startMonitoring()
     * Purpose:
     *   - register a request listener with WebRequestService
     *   - start the underlying monitoring in WebRequestService
     *
     * Key idea:
     *   WebRequestService emits requestData objects.
     *   We interpret them and feed them into PrivacyData (cookies/scripts/requests).
     */
    startMonitoring() {
        // If a listener already exists, remove it first to avoid duplicates.
        if (this.requestListener) {
            this.webRequestService.removeListener(this.requestListener);
        }

        // Define the listener function and keep a reference to it.
        // This function will be called repeatedly as network activity happens.
        this.requestListener = (requestData) => {
            if (!this.currentPrivacyData) return; // ignore if controller not initialized

            // We only notify the rest of the extension if something changed.
            let dataChanged = false;

            // ------------------------------------------------------------------
            // (A) Cookie detection (from request headers)
            // ------------------------------------------------------------------
            // requestData.type === 'cookie' means WebRequestService saw cookie info.
            // requestData.cookies is expected to be an array of raw cookie strings.
            if (requestData.type === 'cookie' && requestData.cookies) {
                requestData.cookies.forEach(cookieString => {
                    // parse "Set-Cookie: ..." style string into a cookie object
                    const cookie = this.parseCookieString(cookieString);

                    // If parsing succeeded, store it.
                    if (cookie) {
                        this.currentPrivacyData.addCookie(cookie);
                        dataChanged = true;
                    }
                });
            }

            // ------------------------------------------------------------------
            // (B) Tracking script detection
            // ------------------------------------------------------------------
            // requestData.type === 'script' means the request was a script resource.
            // requestData.isTracking is presumably decided by WebRequestService heuristics.
            if (requestData.type === 'script' && requestData.isTracking) {
                this.currentPrivacyData.addTrackingScript(requestData.url, 'script');
                dataChanged = true;
            }

            // ------------------------------------------------------------------
            // (C) Network request logging (third-party or tracking)
            // ------------------------------------------------------------------
            // If it is third-party OR tracking, log it.
            // NOTE: addNetworkRequest(url, isThirdParty) only stores the url plus classification.
            if (requestData.isThirdParty || requestData.isTracking) {
                this.currentPrivacyData.addNetworkRequest(
                    requestData.url,
                    requestData.isThirdParty
                );

                // Classify the network request using the same tracker map used for scripts.
                const host = this.currentPrivacyData.hostname || null;
                const netFindings = classifyScripts([requestData.url], host, "Network");
                this.currentPrivacyData.tracking.scriptDetails = this.mergeScriptDetails(
                    this.currentPrivacyData.tracking.scriptDetails,
                    netFindings
                );
                this.syncScriptCountsFromDetails();

                dataChanged = true;
            }

            // ------------------------------------------------------------------
            // (D) Notify update (debounced)
            // ------------------------------------------------------------------
            // We debounce because lots of requests happen quickly.
            // Instead of messaging background 50 times, we wait 200ms and send one update.
            if (dataChanged) {
                if (this.updateTimeout) clearTimeout(this.updateTimeout);
                this.updateTimeout = setTimeout(() => this.notifyUpdate(), 200);
            }
        };

        // Register the listener with the service.
        this.webRequestService.onRequest(this.requestListener);

        // Tell the service to begin monitoring.
        this.webRequestService.startMonitoring();
    }

    /**
     * stopMonitoring()
     * Purpose: stop capturing network events for the current site.
     *
     * Called by: background.js when switching URLs.
     */
    stopMonitoring() {
        // Remove the listener so we stop receiving requestData callbacks.
        if (this.requestListener) {
            this.webRequestService.removeListener(this.requestListener);
        }

        // Stop the underlying monitoring implementation.
        this.webRequestService.stopMonitoring();
    }

    // ---------------------------------------------------------------------------------------------
    //  COOKIE COLLECTION — snapshot cookies via chrome.cookies API
    // ---------------------------------------------------------------------------------------------

    /**
     * collectCookies(url)
     * Purpose:
     *   - collect cookies already stored in the browser for this site's domain
     *
     * Called by: initializeCollection(url)
     *
     * What it collects:
     *   - cookies for domain (example.com)
     *   - cookies for parentDomain (.example.com)
     */
    async collectCookies(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            // Pull cookies matching exact hostname and by full URL as fallback.
            const cookies = await chrome.cookies.getAll({ domain });
            const urlScopedCookies = await chrome.cookies.getAll({ url });

            // Also pull cookies for the parent domain (".example.com").
            const parentDomain = `.${domain}`;
            const parentCookies = await chrome.cookies.getAll({ domain: parentDomain });

            // Combine and store them.
            const allCookies = [...cookies, ...parentCookies, ...urlScopedCookies];
            allCookies.forEach(cookie => this.currentPrivacyData.addCookie(cookie));

            // If we found any cookies, notify background to refresh UI/score.
            if (allCookies.length > 0) this.notifyUpdate();
        } catch (error) {
            console.error("Error collecting cookies:", error);
        }
    }

    /**
     * parseCookieString(cookieString)
     * Purpose:
     *   Convert a Set-Cookie style string into a cookie object compatible with addCookie.
     *
     * Example input (roughly):
     *   "name=value; Domain=example.com; Path=/; Secure; HttpOnly; SameSite=Lax"
     *
     * Returns:
     *   - cookie object on success
     *   - null on parse error (meaning: ignore that cookieString)
     */
    parseCookieString(cookieString) {
        try {
            // Split into pieces by ";" and trim whitespace.
            const parts = cookieString.split(';').map(p => p.trim());

            // First part should be "name=value"
            const [nameValue] = parts;
            const [name, value] = nameValue.split('=');

            // Build a cookie object with defaults.
            // Defaults matter because cookie strings often omit fields.
            const cookie = {
                name: name || '',
                value: value || '',
                domain: null,        // null = unknown unless "Domain=" appears
                path: '/',           // default path
                secure: false,       // becomes true if "Secure" appears
                httpOnly: false,     // becomes true if "HttpOnly" appears
                sameSite: 'None'     // default if missing
            };

            // Process the remaining attributes.
            parts.slice(1).forEach(part => {
                const [key, val] = part.split('=').map(p => p.trim());
                const keyLower = key.toLowerCase();

                if (keyLower === 'domain') cookie.domain = val;
                else if (keyLower === 'path') cookie.path = val;
                else if (keyLower === 'secure') cookie.secure = true;      // Secure has no "=..."
                else if (keyLower === 'httponly') cookie.httpOnly = true;  // HttpOnly has no "=..."
                else if (keyLower === 'samesite') cookie.sameSite = val || 'None';
                else if (keyLower === 'expires' && val) {
                    // expirationDate uses UNIX seconds in Chrome cookie objects.
                    cookie.expirationDate = new Date(val).getTime() / 1000;
                }
            });

            return cookie;
        } catch (error) {
            console.error("Error parsing cookie string:", error);
            return null;
        }
    }

    // ---------------------------------------------------------------------------------------------
    //  PRIVACY POLICY — set policy URL on the model
    // ---------------------------------------------------------------------------------------------

    /**
     * setPrivacyPolicy(url, summary)
     * Purpose: save the policy URL (and optional summary) into PrivacyData.
     *
     * Called by: background.js when it receives "privacyPolicy:detected"
     */
    setPrivacyPolicy(url, summary = null) {
        if (!this.currentPrivacyData) return;

        this.currentPrivacyData.setPrivacyPolicy(url, summary);
        this.notifyUpdate();
    }

    // ---------------------------------------------------------------------------------------------
    //  GETTERS / PERSISTENCE
    // ---------------------------------------------------------------------------------------------

    /**
     * getCurrentPrivacyData()
     * Purpose: let background.js pull the current live model snapshot.
     */
    getCurrentPrivacyData() {
        return this.currentPrivacyData;
    }

    /**
     * savePrivacyData()
     * Purpose: persist privacy data to storage under a key by hostname.
     *
     * Note:
     *  - Not called from background.js in the code you showed so far.
     *  - This is for "history" features (save per site).
     */
    async savePrivacyData() {
        if (!this.currentPrivacyData) return false;

        const key = `${CONSTANTS.STORAGE_KEYS.PRIVACY_DATA}_${this.currentPrivacyData.hostname}`;
        return await this.storageService.save(key, {
            ...this.currentPrivacyData,
            timestamp: Date.now()
        });
    }

    // ---------------------------------------------------------------------------------------------
    //  UPDATE NOTIFICATIONS — “tell background that data changed”
    // ---------------------------------------------------------------------------------------------

    /**
     * notifyUpdate()
     * Purpose:
     *   send a chrome.runtime message so background.js knows privacy data changed.
     *
     * Who receives it?
     *   background.js listens for: msg.type === "privacyData:updated"
     *
     * Why send summary + privacyData snapshot?
     *   - background can choose to forward to popup or recompute scores
     *   - keeps UI responsive without needing popup to call into controller directly
     */
    notifyUpdate() {
        if (!this.currentPrivacyData) return;

        chrome.runtime.sendMessage({
            type: "privacyData:updated",
            summary: this.currentPrivacyData.getSummary(),

            // This payload mirrors what the popup UI wants to display.
            privacyData: {
                summary: this.currentPrivacyData.getSummary(),

                cookies: {
                    total: this.currentPrivacyData.cookies.firstParty.length +
                           this.currentPrivacyData.cookies.thirdParty.length,
                    thirdParty: this.currentPrivacyData.cookies.thirdParty.length,
                    tracking: this.currentPrivacyData.cookies.tracking.length
                },

                tracking: {
                    scripts: this.currentPrivacyData.tracking.scripts.length,
                    requests: this.currentPrivacyData.networkRequests.tracking.length,
                    scriptDetails: this.currentPrivacyData.tracking.scriptDetails || []
                    // ^ || [] = guarantee an array so UI can iterate without crashing
                },

                privacyPolicy: this.currentPrivacyData.privacyPolicy
            }
        }).catch(() => {
            // If no listener exists (popup closed, or background asleep), ignore.
        });
    }

    /**
     * loadPrivacyData(hostname)
     * Purpose: retrieve saved privacy data for a hostname (history feature).
     */
    async loadPrivacyData(hostname) {
        const key = `${CONSTANTS.STORAGE_KEYS.PRIVACY_DATA}_${hostname}`;
        const data = await this.storageService.get(key);

        if (data) {
            // Rehydrate into a PrivacyData instance so methods like getSummary() exist.
            const privacyData = new PrivacyData(data.url);
            Object.assign(privacyData, data);
            return privacyData;
        }

        return null;
    }
}
