// =================================================================================================
//  src/models/PrivacyData.js
// =================================================================================================
//
//  WHAT THIS MODEL IS (mental model):
//    PrivacyData = the structured “data bucket” for one website session.
//    It stores the raw counts/lists that UI + scoring use.
//
//  WHO WRITES TO THIS MODEL?
//    PrivacyDataController primarily, via:
//      - addCookie(cookie)
//      - addTrackingScript(url, category)
//      - addNetworkRequest(url, isThirdParty)
//      - setPrivacyPolicy(url, summary)
//
//  WHO READS FROM THIS MODEL?
//    - PrivacyScore (for scoring)
//    - background.js (to package data to popup)
//    - popup UI (indirectly through background messages)
//
//  NOTE ABOUT notifyUpdate():
//    This model has a notifyUpdate() placeholder, but your real notification path is:
//      PrivacyDataController.notifyUpdate() -> chrome.runtime.sendMessage("privacyData:updated")
//    So model-level notifyUpdate() is effectively legacy/unused unless something calls it.
//
// =================================================================================================

export class PrivacyData {
    constructor(url) {
        this.url = url;

        this.hostname = url ? new URL(url).hostname : null;
        // ^ null = constructed without a valid URL

        this.timestamp = Date.now();

        // Sets to prevent unbounded duplication when a tab stays open.
        // We key by stable identifiers so repeated requests/cookies don't inflate counts.
        this._seen = {
            cookies: new Set(),
            scripts: new Set(),
            requests: new Set()
        };

        // ----------------------------
        // Cookie buckets
        // ----------------------------
        this.cookies = {
            firstParty: [],
            thirdParty: [],
            tracking: [],
            session: []
        };

        // ----------------------------
        // Storage buckets (not populated in current code path yet)
        // ----------------------------
        this.storage = {
            localStorage: [],
            sessionStorage: []
        };

        // ----------------------------
        // Tracking buckets
        // ----------------------------
        this.tracking = {
            scripts: [],
            pixels: [],
            analytics: [],
            socialMedia: [],
            advertising: []
        };

        // ----------------------------
        // Network request buckets
        // ----------------------------
        this.networkRequests = {
            thirdParty: [],
            tracking: [],
            dataBrokers: []
        };

        // ----------------------------
        // Privacy policy info
        // ----------------------------
        this.privacyPolicy = {
            found: false,
            url: null,      // null = not found yet
            summary: null   // null = no summary generated yet
        };
    }

    /**
     * notifyUpdate()
     * Intentionally empty.
     * Kept as a compatibility placeholder, but controller-level notifyUpdate() is the real one.
     */
    notifyUpdate() {}

    /**
     * addCookie(cookie)
     * Input:
     *   - chrome.cookies cookie object OR a parsed cookie object from parseCookieString()
     *
     * Output:
     *   - pushes cookieData into one or more arrays (firstParty/thirdParty/tracking/session)
     */
    addCookie(cookie) {
        const cookieKey = this.makeCookieKey(cookie);
        if (this._seen.cookies.has(cookieKey)) return;
        this._seen.cookies.add(cookieKey);

        const cookieData = {
            name: cookie.name,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expirationDate: cookie.expirationDate,
            isTracking: this.isTrackingCookie(cookie)
        };

        // First-party vs third-party categorization based on domain match.
        if (cookie.domain === this.hostname || cookie.domain === `.${this.hostname}`) {
            this.cookies.firstParty.push(cookieData);
        } else {
            this.cookies.thirdParty.push(cookieData);
        }

        if (cookieData.isTracking) {
            this.cookies.tracking.push(cookieData);
        }

        // No expirationDate means “session cookie”.
        if (!cookie.expirationDate) {
            this.cookies.session.push(cookieData);
        }

        // NOTE: in your current architecture, this does nothing (notifyUpdate is empty).
        this.notifyUpdate();
    }

    /**
     * addStorageItem(type, key, value)
     * Not currently triggered by the controller you showed (future feature).
     */
    addStorageItem(type, key, value) {
        if (type === 'localStorage') {
            this.storage.localStorage.push({ key, value, size: JSON.stringify(value).length });
        } else if (type === 'sessionStorage') {
            this.storage.sessionStorage.push({ key, value, size: JSON.stringify(value).length });
        }
    }

    /**
     * addTrackingScript(scriptUrl, category)
     * Adds to:
     *   - tracking.scripts always
     *   - and to analytics/socialMedia/advertising/pixels buckets based on heuristics
     */
    addTrackingScript(scriptUrl, category) {
        const scriptKey = this.normalizeUrlKey(scriptUrl);
        const alreadySeen = this._seen.scripts.has(scriptKey);
        this._seen.scripts.add(scriptKey);

        // If already seen, skip adding a duplicate entry.
        if (alreadySeen) {
            return;
        }

        const scriptData = {
            url: scriptUrl,
            domain: this.extractDomain(scriptUrl),
            category: category || 'unknown',
            timestamp: Date.now()
        };

        this.tracking.scripts.push(scriptData);

        if (this.isAnalyticsScript(scriptUrl)) {
            this.tracking.analytics.push(scriptData);
        } else if (this.isSocialMediaScript(scriptUrl)) {
            this.tracking.socialMedia.push(scriptData);
        } else if (this.isAdvertisingScript(scriptUrl)) {
            this.tracking.advertising.push(scriptData);
        } else if (this.isTrackingPixel(scriptUrl)) {
            this.tracking.pixels.push(scriptData);
        }

        // NOTE: in your current architecture, this does nothing (notifyUpdate is empty).
        this.notifyUpdate();
    }

    /**
     * addNetworkRequest(requestUrl, isThirdParty)
     * Adds to:
     *   - networkRequests.thirdParty (if isThirdParty)
     *   - networkRequests.tracking (if heuristic says tracking)
     *   - networkRequests.dataBrokers (if heuristic says databroker)
     */
    addNetworkRequest(requestUrl, isThirdParty) {
        const requestKey = this.normalizeUrlKey(requestUrl);
        const alreadySeen = this._seen.requests.has(requestKey);
        this._seen.requests.add(requestKey);

        // If seen before, only upgrade classification if the new hit is tracking/databroker.
        if (alreadySeen) {
            if (this.isTrackingRequest(requestUrl)) {
                // ensure tracking bucket has this request
                // We don’t store the original object by key, so push once if not present.
                const exists = this.networkRequests.tracking.some(r => this.normalizeUrlKey(r.url) === requestKey);
                if (!exists) {
                    this.networkRequests.tracking.push({
                        url: requestUrl,
                        domain: this.extractDomain(requestUrl),
                        isThirdParty,
                        isTracking: true,
                        timestamp: Date.now()
                    });
                }
            }
            if (this.isDataBroker(requestUrl)) {
                const existsDb = this.networkRequests.dataBrokers.some(r => this.normalizeUrlKey(r.url) === requestKey);
                if (!existsDb) {
                    this.networkRequests.dataBrokers.push({
                        url: requestUrl,
                        domain: this.extractDomain(requestUrl),
                        isThirdParty,
                        isTracking: this.isTrackingRequest(requestUrl),
                        timestamp: Date.now()
                    });
                }
            }
            return;
        }

        const requestData = {
            url: requestUrl,
            domain: this.extractDomain(requestUrl),
            isThirdParty,
            isTracking: this.isTrackingRequest(requestUrl),
            timestamp: Date.now()
        };

        if (isThirdParty) {
            this.networkRequests.thirdParty.push(requestData);
        }

        if (requestData.isTracking) {
            this.networkRequests.tracking.push(requestData);
        }

        if (this.isDataBroker(requestUrl)) {
            this.networkRequests.dataBrokers.push(requestData);
        }

        // NOTE: in your current architecture, this does nothing (notifyUpdate is empty).
        this.notifyUpdate();
    }

    /**
     * setPrivacyPolicy(url, summary)
     * Stores policy URL + (optional) summary
     */
    setPrivacyPolicy(url, summary = null) {
        this.privacyPolicy = {
            found: true,
            url,
            summary,
            timestamp: Date.now()
        };

        // NOTE: in your current architecture, this does nothing (notifyUpdate is empty).
        this.notifyUpdate();
    }

    // ------------------------------------------------------------------------------------------------
    //  READ HELPERS
    // ------------------------------------------------------------------------------------------------

    getTrackingCount() {
        return (
            this.cookies.tracking.length +
            this.tracking.scripts.length +
            this.networkRequests.tracking.length
        );
    }

    getSummary() {
        return {
            totalCookies: this.cookies.firstParty.length + this.cookies.thirdParty.length,
            thirdPartyCookies: this.cookies.thirdParty.length,
            trackingCookies: this.cookies.tracking.length,
            storageItems: this.storage.localStorage.length + this.storage.sessionStorage.length,
            trackingScripts: this.tracking.scripts.length,
            thirdPartyRequests: this.networkRequests.thirdParty.length,
            trackingRequests: this.networkRequests.tracking.length,
            privacyPolicyFound: this.privacyPolicy.found
        };
    }

    // ------------------------------------------------------------------------------------------------
    //  CATEGORIZATION HELPERS (heuristics)
    // ------------------------------------------------------------------------------------------------

    isTrackingCookie(cookie) {
        const trackingKeywords = [
            '_ga',
            '_gid',
            '_gat',
            '_fbp',
            '_fbc',
            'utm_',
            'tracking',
            'analytics',
            'ad',
            'ads',
            'cluid',
            'ajs_',
            'amplitude',
            'sessionid',
            'cid',
            'uid'
        ];
        return trackingKeywords.some(keyword => cookie.name.toLowerCase().includes(keyword));
    }

    isAnalyticsScript(url) {
        const analyticsDomains = ['google-analytics.com', 'googletagmanager.com', 'analytics.js', 'ga.js', 'mixpanel.com', 'segment.com'];
        return analyticsDomains.some(domain => url.includes(domain));
    }

    isSocialMediaScript(url) {
        const socialDomains = ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'pinterest.com', 'tiktok.com'];
        return socialDomains.some(domain => url.includes(domain));
    }

    isAdvertisingScript(url) {
        const adDomains = ['doubleclick.net', 'googlesyndication.com', 'ads', 'advertising', 'adserver', 'adtech'];
        return adDomains.some(domain => url.includes(domain));
    }

    isTrackingPixel(url) {
        return url.match(/\.(gif|png|jpg|jpeg)\?/) && (url.includes('track') || url.includes('pixel') || url.includes('beacon'));
    }

    isTrackingRequest(url) {
        const trackingKeywords = ['track', 'analytics', 'pixel', 'beacon', 'collect', 'log', 'event'];
        return trackingKeywords.some(keyword => url.toLowerCase().includes(keyword));
    }

    isDataBroker(url) {
        const dataBrokerDomains = ['acxiom.com', 'equifax.com', 'experian.com', 'transunion.com', 'oracle.com', 'salesforce.com'];
        return dataBrokerDomains.some(domain => url.includes(domain));
    }

    makeCookieKey(cookie) {
        const domain = (cookie.domain || '').toLowerCase();
        const path = cookie.path || '/';
        const name = cookie.name || '';
        return `${domain}|${path}|${name}`;
    }

    normalizeUrlKey(url) {
        try {
            const u = new URL(url);
            // Remove common cache-busting params but keep meaningful ones.
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

            return `${u.hostname}${u.pathname}${query}`;
        } catch {
            // If URL parsing fails, fall back to raw string key.
            return url || '';
        }
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return null; // null = invalid URL string
        }
    }
}
