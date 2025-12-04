// src/services/xAIService.js
//
// Updated for structured privacy auditing summaries.

const XAI_API_KEY = ""; // Put key here temporarily for testing

class xAIService {

    static async generateSummary(data) {

        const prompt = `
You are an expert privacy auditor. Analyze the following website's privacy risks
using the structured format below. Keep it concise but informative (6–10 sentences total).

STRUCTURE:
1. High-Level Summary (2–3 sentences)
2. Data Collection Practices
3. Privacy Policy Findings
4. Score Assessment (explain whether the given numerical score seems accurate)
5. Risk Breakdown (bullet list)
6. Recommendations (1–3 simple actions)

Maintain a neutral, professional tone. Avoid speculation or emotional language.
Focus only on provided data and common privacy patterns.

--- DATA INPUT BELOW ---
${JSON.stringify(data, null, 2)}
--- END ---
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
            return json?.choices?.[0]?.message?.content || "AI did not return any output.";

        } catch (error) {
            console.error("xAI request failed:", error);
            return "AI summary failed due to API error.";
        }
    }
}

export default xAIService;
