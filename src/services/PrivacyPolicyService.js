// src/services/PrivacyPolicyService.js

export class PrivacyPolicyService {
    constructor() {
        this.commonPolicyPaths = [
            '/privacy',
            '/privacy-policy',
            '/privacy-policy.html',
            '/privacy.html',
            '/privacy-policy.php',
            '/privacy.php',
            '/privacy-statement',
            '/privacy-notice',
            '/legal/privacy',
            '/legal/privacy-policy',
            '/terms/privacy',
            '/policies/privacy'
        ];

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
     * Detect privacy policy URL from a website
     */
    async detectPrivacyPolicy(baseUrl) {
        if (!baseUrl) return null;

        try {
            const url = new URL(baseUrl);
            const baseDomain = `${url.protocol}//${url.hostname}`;

            // Try common privacy policy paths
            for (const path of this.commonPolicyPaths) {
                const policyUrl = `${baseDomain}${path}`;
                if (await this.checkUrlExists(policyUrl)) {
                    return policyUrl;
                }
            }

            // Try to find privacy policy link in page (requires content script)
            // This would need to be implemented with a content script
            return null;
        } catch (error) {
            console.error('Error detecting privacy policy:', error);
            return null;
        }
    }

    /**
     * Check if URL exists (simple HEAD request check)
     */
    async checkUrlExists(url) {
        try {
            const response = await fetch(url, { 
                method: 'HEAD',
                mode: 'no-cors'
            });
            // In no-cors mode, we can't check status, so assume it exists if no error
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Extract privacy policy summary (would require content script or API)
     * This is a placeholder for future implementation
     */
    async extractPolicySummary(policyUrl) {
        // This would require:
        // 1. Content script to fetch and parse the page
        // 2. Or API call to summarize the policy
        // For now, return a placeholder
        return {
            found: true,
            url: policyUrl,
            summary: 'Privacy policy detected. Click to view full policy.',
            keyPoints: []
        };
    }

    /**
     * Search for privacy policy links in HTML content
     */
    findPrivacyPolicyLinks(htmlContent) {
        const links = [];
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
        let match;

        while ((match = linkRegex.exec(htmlContent)) !== null) {
            const href = match[1];
            const text = match[2].toLowerCase();

            // Check if link text contains privacy keywords
            if (this.policyKeywords.some(keyword => text.includes(keyword))) {
                links.push({
                    url: href,
                    text: match[2]
                });
            }
        }

        return links;
    }
}

