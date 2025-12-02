// src/services/WebRequestService.js

export class WebRequestService {
    constructor() {
        this.requestListeners = [];
        this.trackingDomains = new Set();
        this.initializeTrackingDomains();
    }

    /**
     * Initialize known tracking domains
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
     * Start monitoring network requests
     */
    startMonitoring() {
        // Store bound listeners for removal
        this.beforeRequestListener = (details) => {
            this.handleRequest(details);
        };
        
        this.headersReceivedListener = (details) => {
            this.handleResponseHeaders(details);
        };

        // Monitor all requests
        chrome.webRequest.onBeforeRequest.addListener(
            this.beforeRequestListener,
            { urls: ['<all_urls>'] },
            []
        );

        // Monitor response headers for cookies
        chrome.webRequest.onHeadersReceived.addListener(
            this.headersReceivedListener,
            { urls: ['<all_urls>'] },
            ['responseHeaders']
        );
    }

    /**
     * Stop monitoring network requests
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
     * Handle incoming request
     */
    handleRequest(details) {
        const url = details.url;
        const initiator = details.initiator || '';
        const tabId = details.tabId;

        // Skip chrome-extension and chrome:// URLs
        if (url.startsWith('chrome-extension://') || url.startsWith('chrome://')) {
            return;
        }

        // Check if it's a tracking request
        const isTracking = this.isTrackingRequest(url);
        const isThirdParty = this.isThirdPartyRequest(url, initiator);

        // Notify listeners
        this.requestListeners.forEach(listener => {
            listener({
                url,
                tabId,
                isTracking,
                isThirdParty,
                type: details.type,
                timestamp: Date.now()
            });
        });
    }

    /**
     * Handle response headers (for cookie detection)
     */
    handleResponseHeaders(details) {
        const headers = details.responseHeaders || [];
        const setCookieHeaders = headers.filter(h => 
            h.name.toLowerCase() === 'set-cookie'
        );

        if (setCookieHeaders.length > 0) {
            this.requestListeners.forEach(listener => {
                listener({
                    type: 'cookie',
                    cookies: setCookieHeaders.map(h => h.value),
                    url: details.url,
                    tabId: details.tabId,
                    timestamp: Date.now()
                });
            });
        }
    }

    /**
     * Register a listener for requests
     */
    onRequest(listener) {
        this.requestListeners.push(listener);
    }

    /**
     * Remove a listener
     */
    removeListener(listener) {
        const index = this.requestListeners.indexOf(listener);
        if (index > -1) {
            this.requestListeners.splice(index, 1);
        }
    }

    /**
     * Check if URL is a tracking request
     */
    isTrackingRequest(url) {
        const urlLower = url.toLowerCase();
        
        // Check against known tracking domains
        for (const domain of this.trackingDomains) {
            if (urlLower.includes(domain)) {
                return true;
            }
        }

        // Check for tracking keywords
        const trackingKeywords = [
            '/track', '/pixel', '/beacon', '/collect', '/log',
            '/analytics', '/tracking', '/ad', '/ads', '/advertising'
        ];
        
        return trackingKeywords.some(keyword => urlLower.includes(keyword));
    }

    /**
     * Check if request is third-party
     */
    isThirdPartyRequest(url, initiator) {
        if (!initiator) return false;

        try {
            const urlDomain = new URL(url).hostname;
            const initiatorDomain = new URL(initiator).hostname;
            
            // Remove www. prefix for comparison
            const normalizeDomain = (domain) => {
                return domain.replace(/^www\./, '');
            };

            return normalizeDomain(urlDomain) !== normalizeDomain(initiatorDomain);
        } catch {
            return false;
        }
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return null;
        }
    }
}

