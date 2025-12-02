// src/services/PrivacyPolicyService.js
//
// SAFE VERSION — no CSP violations, no forbidden fetch calls.
// All real detection now happens in the content script.

export class PrivacyPolicyService {

    constructor() {
        this.policyKeywords = [
            'privacy',
            'privacy policy',
            'privacy statement',
            'privacy notice',
            'data protection',
            'data privacy'
        ];
    }

    /**
     * Background cannot scan pages or fetch external URLs.
     * Real detection happens in content script.
     * This always returns null — background never guesses policy URLs.
     */
    async detectPrivacyPolicy(baseUrl) {
        return null;
    }

    /**
     * Extract privacy policy summary (placeholder for future AI summary)
     */
    async extractPolicySummary(policyUrl) {
        return {
            found: true,
            url: policyUrl,
            summary: "Privacy policy detected.",
            keyPoints: []
        };
    }

    /**
     * Utility for content-script HTML scanning (not used in background)
     */
    findPrivacyPolicyLinks(htmlContent) {
        const links = [];
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;

        let match;
        while ((match = linkRegex.exec(htmlContent)) !== null) {
            const href = match[1];
            const text = match[2].toLowerCase();

            if (this.policyKeywords.some(keyword => text.includes(keyword))) {
                links.push({ url: href, text: match[2] });
            }
        }

        return links;
    }
}
