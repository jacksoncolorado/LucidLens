// src/models/PrivacyData.js

export class PrivacyData {
    constructor(url) {
        this.url = url;
        this.hostname = url ? new URL(url).hostname : null;
        this.timestamp = Date.now();
        
        // Data categories
        this.cookies = {
            firstParty: [],
            thirdParty: [],
            tracking: [],
            session: []
        };
        
        this.storage = {
            localStorage: [],
            sessionStorage: []
        };
        
        this.tracking = {
            scripts: [],
            pixels: [],
            analytics: [],
            socialMedia: [],
            advertising: []
        };
        
        this.networkRequests = {
            thirdParty: [],
            tracking: [],
            dataBrokers: []
        };
        
        this.privacyPolicy = {
            found: false,
            url: null,
            summary: null
        };
    }


    notifyUpdate() {
        try {
            chrome.runtime.sendMessage({
                type: "privacyData:updated",
                summary: this.getSummary()
            });
        } catch (e) {
            // ignore errors from closed popups
        }
    }

    /**
     * Add a cookie to the appropriate category
     */
    addCookie(cookie) {
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

        // Categorize cookie
        if (cookie.domain === this.hostname || cookie.domain === `.${this.hostname}`) {
            this.cookies.firstParty.push(cookieData);
        } else {
            this.cookies.thirdParty.push(cookieData);
        }

        if (cookieData.isTracking) {
            this.cookies.tracking.push(cookieData);
        }

        if (!cookie.expirationDate) {
            this.cookies.session.push(cookieData);
        }

        // 🔥 notify popup
        this.notifyUpdate();
    }


    /**
     * Add storage item
     */
    addStorageItem(type, key, value) {
        if (type === 'localStorage') {
            this.storage.localStorage.push({ key, value, size: JSON.stringify(value).length });
        } else if (type === 'sessionStorage') {
            this.storage.sessionStorage.push({ key, value, size: JSON.stringify(value).length });
        }
    }

    /**
     * Add tracking script
     */
    addTrackingScript(scriptUrl, category) {
        const scriptData = {
            url: scriptUrl,
            domain: this.extractDomain(scriptUrl),
            category: category || 'unknown',
            timestamp: Date.now()
        };

        this.tracking.scripts.push(scriptData);

        // Further categorization
        if (this.isAnalyticsScript(scriptUrl)) {
            this.tracking.analytics.push(scriptData);
        } else if (this.isSocialMediaScript(scriptUrl)) {
            this.tracking.socialMedia.push(scriptData);
        } else if (this.isAdvertisingScript(scriptUrl)) {
            this.tracking.advertising.push(scriptData);
        } else if (this.isTrackingPixel(scriptUrl)) {
            this.tracking.pixels.push(scriptData);
        }

        // 🔥 notify popup
        this.notifyUpdate();
    }


    /**
     * Add network request
     */
    addNetworkRequest(requestUrl, isThirdParty) {
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

        // 🔥 notify popup
        this.notifyUpdate();
    }


    /**
     * Set privacy policy information
     */
    setPrivacyPolicy(url, summary = null) {
        this.privacyPolicy = {
            found: true,
            url,
            summary,
            timestamp: Date.now()
        };

        // 🔥 notify popup
        this.notifyUpdate();
    }   


    /**
     * Get total count of tracking elements
     */
    getTrackingCount() {
        return (
            this.cookies.tracking.length +
            this.tracking.scripts.length +
            this.networkRequests.tracking.length
        );
    }

    /**
     * Get summary statistics
     */
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

    // Helper methods for categorization

    isTrackingCookie(cookie) {
        const trackingKeywords = ['_ga', '_gid', '_gat', '_fbp', '_fbc', 'utm_', 'tracking', 'analytics', 'ad', 'ads'];
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

    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return null;
        }
    }
}

