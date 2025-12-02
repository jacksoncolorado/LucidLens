// src/controllers/PrivacyDataController.js

import { PrivacyData } from '../models/PrivacyData.js';
import { WebRequestService } from '../services/WebRequestService.js';
import { PrivacyPolicyService } from '../services/PrivacyPolicyService.js';
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

        // Start monitoring network requests
        this.startMonitoring();

        // Detect privacy policy
        const policyUrl = await this.privacyPolicyService.detectPrivacyPolicy(url);
        if (policyUrl) {
            this.currentPrivacyData.setPrivacyPolicy(policyUrl);
        }

        // Get existing cookies for the domain
        await this.collectCookies(url);

        return this.currentPrivacyData;
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

            // Handle cookie detection
            if (requestData.type === 'cookie' && requestData.cookies) {
                requestData.cookies.forEach(cookieString => {
                    const cookie = this.parseCookieString(cookieString);
                    if (cookie) {
                        this.currentPrivacyData.addCookie(cookie);
                    }
                });
            }

            // Handle tracking scripts
            if (requestData.type === 'script' && requestData.isTracking) {
                this.currentPrivacyData.addTrackingScript(requestData.url, 'script');
            }

            // Handle network requests
            if (requestData.isThirdParty || requestData.isTracking) {
                this.currentPrivacyData.addNetworkRequest(
                    requestData.url,
                    requestData.isThirdParty
                );
            }
        };

        this.webRequestService.onRequest(this.requestListener);
        this.webRequestService.startMonitoring();
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.requestListener) {
            this.webRequestService.removeListener(this.requestListener);
        }
        this.webRequestService.stopMonitoring();
    }

    /**
     * Collect cookies for a domain
     */
    async collectCookies(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            // Get all cookies for the domain
            const cookies = await chrome.cookies.getAll({ domain });

            // Also get cookies for parent domain (e.g., .example.com)
            const parentDomain = `.${domain}`;
            const parentCookies = await chrome.cookies.getAll({ domain: parentDomain });

            // Combine and add to PrivacyData
            const allCookies = [...cookies, ...parentCookies];
            allCookies.forEach(cookie => {
                this.currentPrivacyData.addCookie(cookie);
            });
        } catch (error) {
            console.error('Error collecting cookies:', error);
        }
    }

    /**
     * Parse cookie string from Set-Cookie header
     */
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

            // Parse attributes
            parts.slice(1).forEach(part => {
                const [key, val] = part.split('=').map(p => p.trim());
                const keyLower = key.toLowerCase();

                if (keyLower === 'domain') {
                    cookie.domain = val;
                } else if (keyLower === 'path') {
                    cookie.path = val;
                } else if (keyLower === 'secure') {
                    cookie.secure = true;
                } else if (keyLower === 'httponly') {
                    cookie.httpOnly = true;
                } else if (keyLower === 'samesite') {
                    cookie.sameSite = val || 'None';
                } else if (keyLower === 'expires' && val) {
                    cookie.expirationDate = new Date(val).getTime() / 1000;
                }
            });

            return cookie;
        } catch (error) {
            console.error('Error parsing cookie string:', error);
            return null;
        }
    }

    /**
     * Set privacy policy info from external detection (e.g., content script)
     */
    setPrivacyPolicy(url, summary = null) {
        if (!this.currentPrivacyData) return;
        this.currentPrivacyData.setPrivacyPolicy(url, summary);
    }


    /**
     * Get current privacy data
     */
    getCurrentPrivacyData() {
        return this.currentPrivacyData;
    }

    /**
     * Save privacy data to storage
     */
    async savePrivacyData() {
        if (!this.currentPrivacyData) return false;

        const key = `${CONSTANTS.STORAGE_KEYS.PRIVACY_DATA}_${this.currentPrivacyData.hostname}`;
        return await this.storageService.save(key, {
            ...this.currentPrivacyData,
            timestamp: Date.now()
        });
    }

    notifyUpdate() {
        chrome.runtime.sendMessage({
            type: "privacyData:updated",
            summary: this.currentPrivacyData.getSummary()
        }).catch(() => {});
    }

    /**
     * Load privacy data from storage
     */
    async loadPrivacyData(hostname) {
        const key = `${CONSTANTS.STORAGE_KEYS.PRIVACY_DATA}_${hostname}`;
        const data = await this.storageService.get(key);
        
        if (data) {
            // Reconstruct PrivacyData object
            const privacyData = new PrivacyData(data.url);
            Object.assign(privacyData, data);
            return privacyData;
        }

        return null;
    }
}

