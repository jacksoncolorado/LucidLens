// src/controllers/PrivacyDataController.js

import { PrivacyData } from '../models/PrivacyData.js';
import { WebRequestService } from '../services/WebRequestService.js';
import PrivacyPolicyService from '../services/PrivacyPolicyService.js';
import { StorageService } from '../services/StorageService.js';
import { CONSTANTS } from '../utils/constants.js';

export class PrivacyDataController {
    constructor() {
        this.webRequestService = new WebRequestService();
        this.privacyPolicyService = new PrivacyPolicyService();
        this.storageService = new StorageService();
        this.currentPrivacyData = null;
        this.requestListener = null;
    }

    /**
     * Initialize privacy data collection for a website
     */
    async initializeCollection(url) {
        if (!url) return null;

        // Create new PrivacyData instance
        this.currentPrivacyData = new PrivacyData(url);

        // Add field for scriptDetails
        this.currentPrivacyData.tracking.scriptDetails = [];

        // Start monitoring network requests
        this.startMonitoring();

        // Cookies still collected normally
        await this.collectCookies(url);

        return this.currentPrivacyData;
    }

    /**
     * Accept script details from content script
     */
    addScriptDetails(list) {
        if (!this.currentPrivacyData) return;

        this.currentPrivacyData.tracking.scriptDetails = list;
        this.notifyUpdate();
    }

    /**
     * Start monitoring network requests
     */
    startMonitoring() {
        if (this.requestListener) {
            this.webRequestService.removeListener(this.requestListener);
        }

        this.requestListener = (requestData) => {
            if (!this.currentPrivacyData) return;

            let dataChanged = false;

            // Handle cookie detection
            if (requestData.type === 'cookie' && requestData.cookies) {
                requestData.cookies.forEach(cookieString => {
                    const cookie = this.parseCookieString(cookieString);
                    if (cookie) {
                        this.currentPrivacyData.addCookie(cookie);
                        dataChanged = true;
                    }
                });
            }

            // Handle tracking scripts
            if (requestData.type === 'script' && requestData.isTracking) {
                this.currentPrivacyData.addTrackingScript(requestData.url, 'script');
                dataChanged = true;
            }

            // Handle network requests
            if (requestData.isThirdParty || requestData.isTracking) {
                this.currentPrivacyData.addNetworkRequest(
                    requestData.url,
                    requestData.isThirdParty
                );
                dataChanged = true;
            }

            if (dataChanged) {
                if (this.updateTimeout) clearTimeout(this.updateTimeout);
                this.updateTimeout = setTimeout(() => this.notifyUpdate(), 200);
            }
        };

        this.webRequestService.onRequest(this.requestListener);
        this.webRequestService.startMonitoring();
    }

    stopMonitoring() {
        if (this.requestListener) {
            this.webRequestService.removeListener(this.requestListener);
        }
        this.webRequestService.stopMonitoring();
    }

    async collectCookies(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            const cookies = await chrome.cookies.getAll({ domain });
            const parentDomain = `.${domain}`;
            const parentCookies = await chrome.cookies.getAll({ domain: parentDomain });

            const allCookies = [...cookies, ...parentCookies];
            allCookies.forEach(cookie => this.currentPrivacyData.addCookie(cookie));

            if (allCookies.length > 0) this.notifyUpdate();
        } catch (error) {
            console.error("Error collecting cookies:", error);
        }
    }

    parseCookieString(cookieString) {
        try {
            const parts = cookieString.split(';').map(p => p.trim());
            const [nameValue] = parts;
            const [name, value] = nameValue.split('=');

            const cookie = {
                name: name || '',
                value: value || '',
                domain: null,
                path: '/',
                secure: false,
                httpOnly: false,
                sameSite: 'None'
            };

            parts.slice(1).forEach(part => {
                const [key, val] = part.split('=').map(p => p.trim());
                const keyLower = key.toLowerCase();

                if (keyLower === 'domain') cookie.domain = val;
                else if (keyLower === 'path') cookie.path = val;
                else if (keyLower === 'secure') cookie.secure = true;
                else if (keyLower === 'httponly') cookie.httpOnly = true;
                else if (keyLower === 'samesite') cookie.sameSite = val || 'None';
                else if (keyLower === 'expires' && val) cookie.expirationDate = new Date(val).getTime() / 1000;
            });

            return cookie;
        } catch (error) {
            console.error("Error parsing cookie string:", error);
            return null;
        }
    }

    setPrivacyPolicy(url, summary = null) {
        if (!this.currentPrivacyData) return;
        this.currentPrivacyData.setPrivacyPolicy(url, summary);
        this.notifyUpdate();
    }

    getCurrentPrivacyData() {
        return this.currentPrivacyData;
    }

    async savePrivacyData() {
        if (!this.currentPrivacyData) return false;

        const key = `${CONSTANTS.STORAGE_KEYS.PRIVACY_DATA}_${this.currentPrivacyData.hostname}`;
        return await this.storageService.save(key, {
            ...this.currentPrivacyData,
            timestamp: Date.now()
        });
    }

    notifyUpdate() {
        if (!this.currentPrivacyData) return;

        chrome.runtime.sendMessage({
            type: "privacyData:updated",
            summary: this.currentPrivacyData.getSummary(),
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
                },
                privacyPolicy: this.currentPrivacyData.privacyPolicy
            }
        }).catch(() => {});
    }

    async loadPrivacyData(hostname) {
        const key = `${CONSTANTS.STORAGE_KEYS.PRIVACY_DATA}_${hostname}`;
        const data = await this.storageService.get(key);

        if (data) {
            const privacyData = new PrivacyData(data.url);
            Object.assign(privacyData, data);
            return privacyData;
        }

        return null;
    }
}
