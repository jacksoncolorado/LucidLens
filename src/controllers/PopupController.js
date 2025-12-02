import WebsiteController from './WebsiteController.js';
import { BrowserAPIService } from '../services/BrowserAPIService.js'

// src/controllers/PopupController.js

export default class PopupController {

    static async loadWebsiteInfo() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "popup:ready" }, (response) => {

                // 👇 This prevents the annoying message-port warning
                if (chrome.runtime.lastError) {
                    console.warn("Popup message error:", chrome.runtime.lastError.message);

                    resolve({
                        fullUrl: null,
                        host: null,
                        isSecure: false,
                        privacyScore: null,
                        message: "No response from background"
                    });
                    return;
                }

                // If no response was returned
                if (!response) {
                    resolve({
                        fullUrl: null,
                        host: null,
                        isSecure: false,
                        privacyScore: null,
                        message: "No response from background"
                    });
                    return;
                }

                // Normal successful background → popup result
                resolve({
                    fullUrl: response.fullUrl,
                    host: response.host,
                    isSecure: response.isSecure,
                    privacyScore: response.privacyScore,
                    message: response.message
                });
            });
        });
    }
}
