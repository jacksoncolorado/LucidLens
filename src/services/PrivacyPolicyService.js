// src/services/PrivacyPolicyService.js

export default class PrivacyPolicyService {

    /**
     * Fetch stored text by full policy URL (not hostname).
     */
    static async fetchPrivacyPolicyText(policyUrl) {
        return new Promise((resolve) => {
            chrome.storage.local.get("privacyPolicyTexts", (stored) => {
                const all = stored?.privacyPolicyTexts || {};
                resolve(all[policyUrl] || null);
            });
        });
    }

    /**
     * Save or update text for a specific policy URL.
     */
    static async savePrivacyPolicyText(policyUrl, text) {
        return new Promise((resolve) => {
            chrome.storage.local.get("privacyPolicyTexts", (stored) => {
                const all = stored?.privacyPolicyTexts || {};
                all[policyUrl] = text;

                chrome.storage.local.set(
                    { privacyPolicyTexts: all },
                    () => resolve(true)
                );
            });
        });
    }
}
