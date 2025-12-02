// src/models/PrivacyScore.js

export class PrivacyScore {
    constructor(privacyData) {
        this.data = privacyData;
        this.score = 100;
        this.rating = "Unknown";
        this.factors = {};
        this.recommendations = [];
    }

    // ------------------------------
    // Helper: stable bucket scoring
    // ------------------------------
    bucket(value, ranges) {
        for (const r of ranges) {
            if (value >= r.min && value <= r.max) return r.penalty;
        }
        return 0;
    }

    calculate() {
        if (!this.data) {
            this.score = 0;
            this.rating = "Unknown";
            this.factors = {};
            this.recommendations = [];
            return 0;
        }

        // --------------------------
        // Collected data
        // --------------------------
        const scripts = this.data.tracking?.scripts?.length || 0;

        // tracking requests used ONLY for scoring (not all third-party)
        const trackingRequests = this.data.networkRequests?.tracking?.length || 0;

        // third-party total (display only)
        const totalRequests = this.data.networkRequests?.thirdParty?.length || 0;

        const cookies = this.data.cookies?.tracking?.length || 0;
        const policyFound = !!this.data.privacyPolicy?.found;

        // --------------------------
        // Stable Penalty Buckets
        // --------------------------

        const scriptPenalty = this.bucket(scripts, [
            { min: 0, max: 0, penalty: 0 },
            { min: 1, max: 3, penalty: 4 },
            { min: 4, max: 10, penalty: 8 },
            { min: 11, max: 20, penalty: 15 },
            { min: 21, max: Infinity, penalty: 25 }
        ]);

        const requestPenalty = this.bucket(trackingRequests, [
            { min: 0, max: 0, penalty: 0 },
            { min: 1, max: 20, penalty: 2 },
            { min: 21, max: 60, penalty: 5 },
            { min: 61, max: 150, penalty: 12 },
            { min: 151, max: Infinity, penalty: 20 }
        ]);

        const cookiePenalty = this.bucket(cookies, [
            { min: 0, max: 0, penalty: 0 },
            { min: 1, max: 3, penalty: 2 },
            { min: 4, max: 10, penalty: 5 },
            { min: 11, max: 20, penalty: 10 },
            { min: 21, max: Infinity, penalty: 20 }
        ]);

        const policyPenalty = policyFound ? 0 : 10;

        // --------------------------
        // Final Score Calculation
        // --------------------------
        const totalPenalty =
            scriptPenalty + requestPenalty + cookiePenalty + policyPenalty;

        this.score = Math.max(0, 100 - totalPenalty);

        if (this.score >= 85) this.rating = "Excellent";
        else if (this.score >= 70) this.rating = "Good";
        else if (this.score >= 55) this.rating = "Fair";
        else if (this.score >= 40) this.rating = "Poor";
        else this.rating = "Very Poor";

        // --------------------------
        // For breakdown UI
        // --------------------------
        this.factors = {
            scripts,
            trackingRequests,
            totalRequests,
            cookies,
            policyFound,
            scriptPenalty,
            requestPenalty,
            cookiePenalty,
            policyPenalty,
            totalPenalty
        };

        // --------------------------
        // Recommendations
        // --------------------------
        this.recommendations = [];

        if (scripts > 3) {
            this.recommendations.push({
                action: "Use a script blocker",
                description: `${scripts} tracking scripts detected`,
                priority: "high"
            });
        }

        if (!policyFound) {
            this.recommendations.push({
                action: "No privacy policy found",
                description: "Site does not expose a privacy policy",
                priority: "medium"
            });
        }

        if (trackingRequests > 60) {
            this.recommendations.push({
                action: "High tracking activity",
                description: `${trackingRequests} tracking-related requests detected`,
                priority: "medium"
            });
        }

        return this.score;
    }
}
