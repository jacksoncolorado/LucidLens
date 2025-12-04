// src/contentScripts/policyScraper.js

console.log("[PolicyScraper] injected on", location.href);

function extractVisibleText() {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (!node.parentElement) return NodeFilter.FILTER_REJECT;

                const s = window.getComputedStyle(node.parentElement);
                if (
                    s.display === "none" ||
                    s.visibility === "hidden" ||
                    s.opacity === "0"
                ) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let text = "";
    let node;
    while ((node = walker.nextNode())) {
        text += node.textContent + " ";
    }
    return text.replace(/\s+/g, " ").trim();
}

try {
    const text = extractVisibleText();

    chrome.runtime.sendMessage({
        type: "privacyPolicy:textScraped",
        policyUrl: location.href,   // FULL URL KEY
        text
    });

} catch (err) {
    console.error("Policy Scraper Error:", err);
}
