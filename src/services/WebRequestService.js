// =================================================================================================
//  src/services/WebRequestService.js
// =================================================================================================
//
//  WHAT THIS SERVICE DOES (mental model):
//    - Hooks into Chrome's webRequest API (network-level events).
//    - For every request, it builds a simple "requestData" object.
//    - It emits that object to any listeners (PrivacyDataController is the main listener).
//
//  WHO CALLS THIS?
//    PrivacyDataController:
//      - new WebRequestService()
//      - onRequest(listener)
//      - startMonitoring()
//      - stopMonitoring()
//      - removeListener(listener)
//
//  PERMISSIONS THIS IMPLIES:
//    - Uses chrome.webRequest + chrome.webRequest.onHeadersReceived -> requires "webRequest" permission
//    - Uses <all_urls> filtering -> requires host_permissions "<all_urls>"
//
// =================================================================================================

export class WebRequestService {
    constructor() {
        // List of functions to call when a request event happens.
        // Each listener gets a "requestData" object (url, isTracking, isThirdParty, etc).
        this.requestListeners = [];

        // Set() gives fast "contains" checks and avoids duplicates automatically.
        this.trackingDomains = new Set();

        // Fill the Set with known tracking domain strings.
        this.initializeTrackingDomains();
    }

    /**
     * initializeTrackingDomains()
     * Purpose:
     *   - Populate this.trackingDomains with known tracking-related substrings.
     *
     * NOTE: This is a basic heuristic approach:
     *   - It checks "url includes <string>" not exact domain matching.
     *   - That can create false positives, but it’s simple and fast.
     */
    initializeTrackingDomains() {
        const domains = [
            'google-analytics.com',
            'googletagmanager.com',
            'doubleclick.net',
            'googlesyndication.com',
            'facebook.com',
            'facebook.net',
            'twitter.com',
            'linkedin.com',
            'analytics.js',
            'mixpanel.com',
            'segment.com',
            'hotjar.com',
            'amplitude.com',
            'advertising.com',
            'adtech.com'
        ];

        domains.forEach(domain => this.trackingDomains.add(domain));
    }

    /**
     * startMonitoring()
     * Purpose:
     *   - Register listeners with Chrome webRequest events.
     *
     * "Bound listeners for removal":
     *   - We store the function references so stopMonitoring() can remove them later.
     *   - Chrome requires the SAME function reference to remove a listener.
     */
    startMonitoring() {
        // Listener for "request is about to happen"
        this.beforeRequestListener = (details) => {
            this.handleRequest(details);
        };

        // Listener for "response headers received"
        // We use this to detect "Set-Cookie" headers.
        this.headersReceivedListener = (details) => {
            this.handleResponseHeaders(details);
        };

        // Listen to all requests (every URL).
        chrome.webRequest.onBeforeRequest.addListener(
            this.beforeRequestListener,
            { urls: ['<all_urls>'] },
            []
        );

        // Listen to response headers so we can read Set-Cookie headers.
        chrome.webRequest.onHeadersReceived.addListener(
            this.headersReceivedListener,
            { urls: ['<all_urls>'] },
            ['responseHeaders']
        );
    }

    /**
     * stopMonitoring()
     * Purpose:
     *   - Remove the two Chrome listeners we added in startMonitoring().
     */
    stopMonitoring() {
        if (this.beforeRequestListener) {
            chrome.webRequest.onBeforeRequest.removeListener(this.beforeRequestListener);
        }
        if (this.headersReceivedListener) {
            chrome.webRequest.onHeadersReceived.removeListener(this.headersReceivedListener);
        }
    }

    /**
     * handleRequest(details)
     * Called by:
     *   - chrome.webRequest.onBeforeRequest -> startMonitoring() listener
     *
     * Builds:
     *   requestData = { url, tabId, isTracking, isThirdParty, type, timestamp }
     *
     * Then:
     *   - emits requestData to every registered requestListener
     */
    handleRequest(details) {
        const url = details.url;

        // initiator is the "originating page" that triggered the request.
        // If missing, we treat it as empty string and third-party detection becomes false.
        const initiator = details.initiator || '';

        const tabId = details.tabId;

        // Ignore internal Chrome/extension requests.
        if (url.startsWith('chrome-extension://') || url.startsWith('chrome://')) {
            return;
        }

        // Heuristic flags
        const isTracking = this.isTrackingRequest(url);
        const isThirdParty = this.isThirdPartyRequest(url, initiator);

        // Emit to all listeners.
        this.requestListeners.forEach(listener => {
            listener({
                url,
                tabId,
                isTracking,
                isThirdParty,
                type: details.type,   // e.g. "script", "image", "xmlhttprequest"
                timestamp: Date.now()
            });
        });
    }

    /**
     * handleResponseHeaders(details)
     * Called by:
     *   - chrome.webRequest.onHeadersReceived -> startMonitoring() listener
     *
     * Purpose:
     *   - Pull "Set-Cookie" response headers out of the response.
     *   - Emit a synthetic requestData event of type: 'cookie'
     *
     * Why:
     *   - Some cookies are most visible at the header layer when the server sets them.
     */
    handleResponseHeaders(details) {
        const headers = details.responseHeaders || [];

        // Filter for headers named "Set-Cookie"
        const setCookieHeaders = headers.filter(h =>
            h.name.toLowerCase() === 'set-cookie'
        );

        // If any Set-Cookie headers exist, emit them to listeners.
        if (setCookieHeaders.length > 0) {
            this.requestListeners.forEach(listener => {
                listener({
                    type: 'cookie',
                    cookies: setCookieHeaders.map(h => h.value), // raw Set-Cookie strings
                    url: details.url,
                    tabId: details.tabId,
                    timestamp: Date.now()
                });
            });
        }
    }

    /**
     * onRequest(listener)
     * Purpose:
     *   - Register a callback to receive requestData objects.
     *
     * Used by:
     *   PrivacyDataController.startMonitoring()
     */
    onRequest(listener) {
        this.requestListeners.push(listener);
    }

    /**
     * removeListener(listener)
     * Purpose:
     *   - Remove a previously registered request listener.
     *
     * Used by:
     *   PrivacyDataController.stopMonitoring() or startMonitoring() reset logic
     */
    removeListener(listener) {
        const index = this.requestListeners.indexOf(listener);
        if (index > -1) {
            this.requestListeners.splice(index, 1);
        }
    }

    /**
     * isTrackingRequest(url)
     * Purpose:
     *   - Decide if URL "looks like" tracking.
     *
     * Strategy:
     *   (1) Check known tracking domain substrings
     *   (2) Check tracking keyword substrings
     */
    isTrackingRequest(url) {
        const urlLower = url.toLowerCase();

        for (const domain of this.trackingDomains) {
            if (urlLower.includes(domain)) {
                return true;
            }
        }

        const trackingKeywords = [
            '/track', '/pixel', '/beacon', '/collect', '/log',
            '/analytics', '/tracking', '/ad', '/ads', '/advertising'
        ];

        return trackingKeywords.some(keyword => urlLower.includes(keyword));
    }

    /**
     * isThirdPartyRequest(url, initiator)
     * Purpose:
     *   - Determine if request is “third-party” compared to the page initiating it.
     *
     * Strategy:
     *   - Compare hostname(url) vs hostname(initiator)
     *   - Normalize by stripping "www."
     */
    isThirdPartyRequest(url, initiator) {
        if (!initiator) return false; // initiator missing => can't compare => assume not third-party

        try {
            const urlDomain = new URL(url).hostname;
            const initiatorDomain = new URL(initiator).hostname;

            const normalizeDomain = (domain) => domain.replace(/^www\./, '');

            return normalizeDomain(urlDomain) !== normalizeDomain(initiatorDomain);
        } catch {
            return false; // malformed URL/initiator => can't compare
        }
    }

    /**
     * extractDomain(url)
     * Purpose:
     *   - Utility function to parse hostname from url string.
     *
     * NOTE: Not used inside this service (currently unused).
     */
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return null; // null = invalid URL string
        }
    }
}
