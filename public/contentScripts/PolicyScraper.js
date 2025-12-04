// src/contentScripts/policyScraper.js

console.log("[PolicyScraper] Injected on:", location.href);

function extractAllText() {
    let text = "";

    // 1. Visible text
    if (document.body) {
        text += document.body.innerText + "\n";
    }

    // 2. JSON-LD structured data (common on major news sites)
    document.querySelectorAll('script[type="application/ld+json"]').forEach(tag => {
        try {
            const json = JSON.parse(tag.textContent.trim());
            text += "\n" + JSON.stringify(json);
        } catch { }
    });

    // 3. Next.js (NYTimes, WBD, CNN variations)
    const nextData = document.querySelector("#__NEXT_DATA__");
    if (nextData) {
        text += "\n" + nextData.textContent;
    }

    // 4. Script blocks containing policy content
    document.querySelectorAll("script").forEach(tag => {
        const content = tag.textContent.toLowerCase();
        if (content.includes("privacy") || content.includes("policy")) {
            text += "\n" + tag.textContent;
        }
    });

    return text.trim();
}

try {
    const text = extractAllText();

    chrome.runtime.sendMessage({
        type: "privacyPolicy:textScraped",
        policyUrl: location.href,
        text
    });

} catch (err) {
    console.error("[Policy Scraper Error]:", err);
}
