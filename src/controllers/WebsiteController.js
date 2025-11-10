import { detectURL } from '../services/DetectURL.js';
import { StorageService } from '../services/StorageService.js';
import { CONSTANTS } from '../utils/constants';

export class WebsiteController {
    constructor() {
        this.StorageService = new StorageService();
        this.currentWebsite = null;
    }

    async detectWebsite(inputUrl) {
        // Ask your detector for the active tab’s info
        // (returns { url, domainDisplay, tabId })
        const info = await detectURL().catch((e) => {
            console.warn('detectURL() failed:', e);
            return null;
        });

        // Choose the URL to analyze:
        // 1) prefer detectURL().url, else use the caller’s inputUrl, else bail.
        const url = info?.url || inputUrl || null;
        if (!url) return null;

        // Safely derive hostname/protocol/isSecure from the URL string
        let hostname = '';
        let protocol = '';
        let isSecure = false;
        try {
            const u = new URL(url);
            hostname = u.hostname;
            protocol = (u.protocol || '').replace(':', ''); // "https:" -> "https"
            isSecure = protocol.toLowerCase() === 'https';
        } catch {
          // If the URL can’t be parsed, we can’t analyze it
          return null;
        }

        // Prefer your detector’s friendly display domain if present,
        // else fall back to hostname, else the raw URL
        const displayUrl = info?.domainDisplay || hostname || url;

        // Plain object (transparent & simple)
        const website = {
          url,
          hostname,
          protocol,
          isSecure,
          displayUrl,
          timestamp: Date.now(),
        };

        // Block internal/extension pages (replacement for validators/isSpecialPage)
        if (!this.canAnalyzeWebsite(website)) {
          this.currentWebsite = null;
          return null;
        }

        // Persist exactly like before so popup/background behaviors remain unchanged
        this.currentWebsite = website;
        await this.StorageService.save(CONSTANTS.STORAGE_KEYS.CURRENT_WEBSITE, {
          url: website.url,
          hostname: website.hostname,
          protocol: website.protocol,
          isSecure: website.isSecure,
          timestamp: website.timestamp,
        });

        return website;
    }


    // Getter for what we last detected
    async getCurrentWebsite() {
        return this.currentWebsite;
    }

    // No validators, will block internal browser and extension pages
    canAnalyzeWebsite(website) {
        if (!website.url) return false;
        const u = website.url;
        return !(
          u.startsWith('chrome://') ||
          u.startsWith('edge://') ||
          u.startsWith('about:') ||
          u.startsWith('chrome-extension://')
        );
    }

    getWebsiteDisplayInfo(website) {
        if (!website) {
            return {
                displayUrl: 'No Website Detected',
                canAnalyze: false,
                isSecure: false,
                message: 'Please Navigate To A Website'
            };
        }

        if (!this.canAnalyzeWebsite(website)) {
          return {
            displayUrl: website.displayUrl || website.hostname || 'Internal Page',
            canAnalyze: false,
            isSecure: false,
            message: 'Cannot Analyze Browser Internal Pages',
          };
        }

        return {
            displayUrl: website.displayUrl || website.hostname || website.url,
            fullUrl: website.url,
            hostname: website.hostname,
            canAnalyze: true,
            isSecure: website.isSecure,
            message: website.isSecure ? 'Secure Connection' : 'Insecure Connection'
        };
    }
}