// contentScripts/privacyScanner.js

function scanForPrivacyPolicy() {
    const links = Array.from(document.querySelectorAll("a[href]"));

    const matches = links
        .map(a => a.href.trim())
        .filter(href =>
            /(privacy|privacy\-policy|legal\/privacy|policy)/i.test(href)
        );

    if (matches.length > 0) {
        chrome.runtime.sendMessage({
            type: "privacyPolicy:detected",
            urls: Array.from(new Set(matches)) // de-duplicate
        });
    }
}

// -----------------------------
// Initial delayed scan
// -----------------------------
setTimeout(() => {
    scanForPrivacyPolicy();
}, 300);

// -----------------------------
// Observe DOM changes for late-loaded footers
// -----------------------------
const observer = new MutationObserver(() => {
    scanForPrivacyPolicy();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

window.addEventListener("beforeunload", () => {
    observer.disconnect();
});
