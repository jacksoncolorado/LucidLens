// src/controllers/PopupController.js

import PrivacyPolicyService from "../services/PrivacyPolicyService.js";
import xAIService from "../services/xAIService.js";

export default class PopupController {

    /**
     * Wait for canonical URL after redirects.
     */
    static waitForFinalUrl() {
        return new Promise(resolve => {
            const listener = (msg) => {
                if (msg.type === "policyScrape:complete") {
                    chrome.runtime.onMessage.removeListener(listener);
                    resolve(msg.finalUrl);
                }
            };

            chrome.runtime.onMessage.addListener(listener);

            // Safety timeout
            setTimeout(() => {
                chrome.runtime.onMessage.removeListener(listener);
                resolve(null);
            }, 8000);
        });
    }


    /**
     * Load website info from background.
     */
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


    /**
     * Generate AI summary.
     */
    static async generateAISummary({ fullUrl, host, privacyScore, cookies, tracking, privacyPolicy }) {
        try {
            let policyUrl = privacyPolicy?.url || null;
            if (!policyUrl) {
                return {
                    success: false,
                    summary: "No privacy policy URL detected.",
                    finalUrl: null
                };
            }

            // -----------------------------
            // Attempt 1: Cached text
            // -----------------------------
            let policyText = await PrivacyPolicyService.fetchPrivacyPolicyText(policyUrl);
            console.log("[Popup] Loaded policy text:", policyUrl, "=>", !!policyText);

            // -----------------------------
            // Attempt 2: Auto scrape
            // -----------------------------
            if (!policyText) {
                console.log("[Popup] Triggering autoScrape for:", policyUrl);

                chrome.runtime.sendMessage({
                    type: "privacyPolicy:autoScrape",
                    url: policyUrl
                });

                // Wait for real redirected URL
                const finalUrl = await PopupController.waitForFinalUrl();

                let lookupUrl = policyUrl;

                if (finalUrl && finalUrl !== policyUrl) {
                console.log("[Popup] Canonical URL resolved:", finalUrl);
                policyUrl = finalUrl;
                lookupUrl = finalUrl;

                // 🔥 CRITICAL FIX: Update the original privacyPolicy object
                 if (privacyPolicy) {
                 privacyPolicy.url = finalUrl;
                }
                }


                // Now load policy text using REAL URL
                policyText = await PrivacyPolicyService.fetchPrivacyPolicyText(lookupUrl);

                console.log("[Popup] After autoScrape, policy text:", lookupUrl, "=>", !!policyText);

                // return canonical URL so Svelte can update display + future lookups
                policyUrl = lookupUrl;
                if (privacyPolicy) {
                privacyPolicy.url = policyUrl;
                }

            }

            if (!policyText) {
                policyText = "No privacy policy text could be retrieved.";
            }

            // -----------------------------
            // Build payload for AI
            // -----------------------------
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

            return {
                success: true,
                summary,
                finalUrl: policyUrl      // ← **Svelte MUST update state with this**
            };

        } catch (err) {
            console.error("AI Summary Error:", err);
            return {
                success: false,
                summary: "AI summary failed.",
                finalUrl: null
            };
        }
    }
}
