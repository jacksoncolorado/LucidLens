// src/controllers/WebsiteController.js

import { detectURL, simplifyDomain } from "../services/DetectURL.js";

export default class WebsiteController {

    static async processWebsite(url) {
        try {
            // Use DetectURL.js to extract domain + tab info
            const detected = await detectURL();

            return {
                fullUrl: detected.url,
                host: detected.domainDisplay,
                isSecure: detected.url?.startsWith("https://") ?? false
            };

        } catch (err) {
            console.error("WebsiteController error:", err);

            return {
                fullUrl: null,
                host: null,
                isSecure: false
            };
        }
    }
}
