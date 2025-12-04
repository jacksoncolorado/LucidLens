// src/controllers/PopupController.js

import PrivacyPolicyService from "../services/PrivacyPolicyService.js";
import xAIService from "../services/xAIService.js";

export default class PopupController {

    static async loadWebsiteInfo() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "popup:ready" }, (response) => {
                if (chrome.runtime.lastError || !response) {
                    resolve({
                        fullUrl: null,
                        host: null,
                        isSecure: false,
                        privacyScore: null,
                        privacyData: null,
                        privacyScoreDetails: null,
                        message: "No response from background"
                    });
                    return;
                }

                resolve(response);
            });
        });
    }

    static async generateAISummary({ fullUrl, host, privacyScore, cookies, tracking, privacyPolicy }) {
        try {
            const policyUrl = privacyPolicy?.url || null;
            if (!policyUrl) {
                return {
                    success: false,
                    summary: "No privacy policy URL detected."
                };
            }

            // ----------------------------------------------
            // Attempt 1 — load text for this exact URL
            // ----------------------------------------------
            let policyText = await PrivacyPolicyService.fetchPrivacyPolicyText(policyUrl);
            console.log("[Popup] Loaded policy text for URL:", policyUrl, "=>", !!policyText);

            // ----------------------------------------------
            // Attempt 2 — Auto-scrape if missing
            // ----------------------------------------------
            if (!policyText) {
                console.log("[Popup] Triggering autoScrape for:", policyUrl);

                chrome.runtime.sendMessage({
                    type: "privacyPolicy:autoScrape",
                    url: policyUrl
                });

                // give scraper time to run
                await new Promise((r) => setTimeout(r, 4500));

                policyText = await PrivacyPolicyService.fetchPrivacyPolicyText(policyUrl);
                console.log("[Popup] After autoScrape, policy text for", policyUrl, "=>", !!policyText);
            }

            if (!policyText) {
                policyText = "No privacy policy text could be retrieved.";
            }

            // Build AI payload
            const payload = {
                url: fullUrl,
                host,
                score: privacyScore || null,
                cookies,
                trackers: tracking,
                privacyPolicyUrl: policyUrl,
                privacyPolicyText: policyText
            };

            const summary = await xAIService.generateSummary(payload);
            return { success: true, summary };

        } catch (err) {
            console.error("AI Summary Error:", err);
            return { success: false, summary: "AI summary failed." };
        }
    }
}
