// src/services/xAIService.js

const XAI_API_KEY = ""; // Put key in here for testing

export async function analyzePrivacy(url) {
    console.log("🔥 analyzePrivacy() CALLED for:", url);
    try {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${XAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "grok-4-1-fast-reasoning",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a privacy auditor AI. " +
                            "Given a website URL, evaluate its privacy practices. " +
                            "Your output MUST ALWAYS follow this exact JSON structure:\n\n" +
                            "{\n" +
                            '  "score": <0-100>,\n' +
                            '  "summary": "<1 to 5 sentence explanation>"\n' +
                            "}\n\n" +
                            "Only output valid JSON. No extra text."
                    },
                    {
                        role: "user",
                        content: `Analyze the privacy of: ${url}`
                    }
                ]
            })
        });

        const data = await response.json();

        // Parse JSON from model response
        const raw = data?.choices?.[0]?.message?.content || "{}";

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            console.error("JSON parse failed, model returned:", raw);
            parsed = { score: null, summary: "Unable to parse model output." };
        }

        return {
            score: parsed.score,
            summary: parsed.summary
        };

    } catch (error) {
        console.error("xAI request failed:", error);
        return {
            score: null,
            summary: "API error — could not generate score."
        };
    }
}
