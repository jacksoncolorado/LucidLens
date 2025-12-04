// src/services/xAIService.js
//
// Updated for structured privacy auditing summaries.


// src/services/xAIService.js
//
// Fully upgraded AI summarization engine for PrivacyLens.
// Includes: polished summaries, category context, cleanup,
// consistent section formatting, and safer handling of AI output.

const XAI_API_KEY = ""; // Put key here temporarily for testing

class xAIService {

    // -------------------------------
    // SITE CATEGORY DETECTION
    // -------------------------------
    static classifySite(hostname = "") {
        hostname = hostname.toLowerCase();

        const newsKeywords = ["news", "cnn", "foxnews", "nbc", "abc", "cbs", "nbcsports", "espn"];
        const socialKeywords = ["facebook", "twitter", "reddit", "instagram", "tiktok", "snapchat"];
        const commerceKeywords = ["amazon", "ebay", "walmart", "bestbuy", "target"];
        const financeKeywords = ["bank", "credit", "capitalone", "chase", "boa", "wellsfargo"];
        const streamingKeywords = ["netflix", "hulu", "disney", "max", "spotify", "youtube"];

        if (newsKeywords.some(k => hostname.includes(k))) return "News";
        if (socialKeywords.some(k => hostname.includes(k))) return "Social Media";
        if (commerceKeywords.some(k => hostname.includes(k))) return "E-Commerce";
        if (financeKeywords.some(k => hostname.includes(k))) return "Finance";
        if (streamingKeywords.some(k => hostname.includes(k))) return "Streaming";

        return "General Website";
    }


    // -------------------------------
    // AI SUMMARY CLEANUP
    // -------------------------------
    static cleanSummary(text) {
        if (!text) return "";

        let cleaned = text;

        // Remove markdown and formatting artifacts
        cleaned = cleaned.replace(/\*\*/g, "");
        cleaned = cleaned.replace(/[#_*`]/g, "");

        // Normalize section headers
        cleaned = cleaned.replace(/Summary[:\-]*/i, "Summary");
        cleaned = cleaned.replace(/Data Collection Practices[:\-]*/i, "Data Collection Practices");
        cleaned = cleaned.replace(/Privacy Policy Highlights[:\-]*/i, "Privacy Policy Highlights");
        cleaned = cleaned.replace(/Score Explanation[:\-]*/i, "Score Explanation");
        cleaned = cleaned.replace(/Risk Breakdown[:\-]*/i, "Risk Breakdown");
        cleaned = cleaned.replace(/Recommendations[:\-]*/i, "Recommendations");

        // Ensure spacing is clean
        cleaned = cleaned.replace(/\n{3,}/g, "\n\n");   // collapse triple newlines
        cleaned = cleaned.replace(/ {2,}/g, " ");       // excess spaces
        cleaned = cleaned.trim();

        return cleaned;
    }


    // -------------------------------
    // AI REQUEST
    // -------------------------------
    static async generateSummary(data) {

        const category = this.classifySite(data.host);

        const prompt = `
You are PrivacyLens, a professional but approachable privacy analyst.
Write a clear, easy-to-read summary for everyday users. Avoid legal jargon and keep sections concise.

IMPORTANT:
The website category is: ${category}.
Use this category to explain whether the privacy score is typical, above average, or concerning.

Follow this exact structure (no markdown symbols, no bold, no asterisks):

1. Summary
Explain the site's overall privacy posture in 2–3 short sentences. 
If the privacy score is normal for the site's category, say so to reassure the user.

2. Data Collection Practices
Describe the types of data the site collects based on cookies, trackers, and policy text.
Mention important trackers (analytics, ads, profiling tools) and explain what they do in plain English.
If the policy lists identifiers like name, email, device info, location, or browsing history, summarize them.

3. Privacy Policy Highlights
Summarize key points users often miss or misunderstand.
Examples: data sharing with partners, targeted ads, personalization, retention, user rights, consent tools.
If policy text was not available, explain the limitation without alarmism.

4. Score Explanation
Explain the score using clean reasoning (tracking amount, cookie types, transparency).
State whether the score is typical or unusual for the website category.

5. Risk Breakdown
List the 3–5 most relevant risks in short bullet points.
Focus on practical privacy concerns, written in user-friendly language.

6. Recommendations
Provide 2–4 simple, actionable suggestions (e.g., limit ad personalization, use a tracker blocker, 
review account settings, avoid sharing unnecessary personal data).
Tone should be empowering and non-fearful.

Do not repeat numbers already shown elsewhere in the UI.
Do not speculate about things not supported by cookies, trackers, or policy text.
Do not mention you are an AI model.

---------- DATA INPUT ----------
${JSON.stringify({ ...data, category }, null, 2)}
--------------------------------
`;

        try {
            const response = await fetch("https://api.x.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${XAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "grok-4-1-fast",
                    temperature: 0.2,
                    messages: [
                        { role: "system", content: "You are a privacy auditing assistant." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const json = await response.json();
            let output = json?.choices?.[0]?.message?.content || "";

            // Apply polishing cleanup
            output = this.cleanSummary(output);

            return output;

        } catch (error) {
            console.error("xAI request failed:", error);
            return "AI summary failed due to an API error.";
        }
    }
}

export default xAIService;
