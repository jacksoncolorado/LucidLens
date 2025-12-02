// src/models/PrivacyScore.js

export class PrivacyScore {
    constructor(privacyData) {
        this.privacyData = privacyData;
        this.score = 0;
        this.maxScore = 100;
        this.rating = 'Unknown';
        this.factors = [];
        this.recommendations = [];
    }

    /**
     * Calculate privacy score based on collected data
     */
    calculate() {
        if (!this.privacyData) {
            this.score = 0;
            this.rating = 'Unknown';
            return;
        }

        let score = this.maxScore;
        const summary = this.privacyData.getSummary();
        this.factors = [];

        // Deduct points for tracking cookies (max -30 points)
        const trackingCookiePenalty = Math.min(summary.trackingCookies * 3, 30);
        if (trackingCookiePenalty > 0) {
            score -= trackingCookiePenalty;
            this.factors.push({
                type: 'negative',
                description: `${summary.trackingCookies} tracking cookies detected`,
                impact: -trackingCookiePenalty
            });
        }

        // Deduct points for third-party cookies (max -20 points)
        const thirdPartyCookiePenalty = Math.min(summary.thirdPartyCookies * 2, 20);
        if (thirdPartyCookiePenalty > 0) {
            score -= thirdPartyCookiePenalty;
            this.factors.push({
                type: 'negative',
                description: `${summary.thirdPartyCookies} third-party cookies detected`,
                impact: -thirdPartyCookiePenalty
            });
        }

        // Deduct points for tracking scripts (max -25 points)
        const trackingScriptPenalty = Math.min(summary.trackingScripts * 2, 25);
        if (trackingScriptPenalty > 0) {
            score -= trackingScriptPenalty;
            this.factors.push({
                type: 'negative',
                description: `${summary.trackingScripts} tracking scripts detected`,
                impact: -trackingScriptPenalty
            });
        }

        // Deduct points for third-party requests (max -15 points)
        const thirdPartyRequestPenalty = Math.min(summary.thirdPartyRequests / 10, 15);
        if (thirdPartyRequestPenalty > 0) {
            score -= thirdPartyRequestPenalty;
            this.factors.push({
                type: 'negative',
                description: `${summary.thirdPartyRequests} third-party requests detected`,
                impact: -thirdPartyRequestPenalty
            });
        }

        // Add points for privacy policy (max +10 points)
        if (summary.privacyPolicyFound) {
            score += 10;
            this.factors.push({
                type: 'positive',
                description: 'Privacy policy found',
                impact: 10
            });
        } else {
            this.factors.push({
                type: 'negative',
                description: 'No privacy policy detected',
                impact: 0
            });
        }

        // Ensure score is between 0 and 100
        this.score = Math.max(0, Math.min(100, score));

        // Determine rating
        this.rating = this.getRating(this.score);

        // Generate recommendations
        this.generateRecommendations(summary);
    }

    /**
     * Get rating category based on score
     */
    getRating(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        if (score >= 20) return 'Poor';
        return 'Very Poor';
    }

    /**
     * Generate privacy recommendations
     */
    generateRecommendations(summary) {
        this.recommendations = [];

        if (summary.trackingCookies > 0) {
            this.recommendations.push({
                priority: 'high',
                action: 'Consider blocking tracking cookies',
                description: `${summary.trackingCookies} tracking cookies are being set`
            });
        }

        if (summary.thirdPartyCookies > 0) {
            this.recommendations.push({
                priority: 'medium',
                action: 'Review third-party cookie usage',
                description: `${summary.thirdPartyCookies} third-party cookies detected`
            });
        }

        if (summary.trackingScripts > 5) {
            this.recommendations.push({
                priority: 'high',
                action: 'Use a script blocker',
                description: `${summary.trackingScripts} tracking scripts detected`
            });
        }

        if (!summary.privacyPolicyFound) {
            this.recommendations.push({
                priority: 'medium',
                action: 'No privacy policy found',
                description: 'Consider reviewing privacy practices before sharing data'
            });
        }

        if (summary.thirdPartyRequests > 20) {
            this.recommendations.push({
                priority: 'medium',
                action: 'High number of third-party requests',
                description: `${summary.thirdPartyRequests} third-party requests detected`
            });
        }
    }

    /**
     * Get color for score display
     */
    getScoreColor() {
        if (this.score >= 80) return '#10b981'; // green
        if (this.score >= 60) return '#3b82f6'; // blue
        if (this.score >= 40) return '#f59e0b'; // yellow
        if (this.score >= 20) return '#ef4444'; // red
        return '#dc2626'; // dark red
    }

    /**
     * Get formatted score display
     */
    getFormattedScore() {
        return Math.round(this.score);
    }
}

