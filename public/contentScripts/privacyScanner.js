// contentScripts/privacyScanner.js

function scanForPrivacyPolicy() {
    const links = Array.from(document.querySelectorAll("a[href]"));

    const matches = links
        .map(a => a.href.trim())
        .filter(href =>
            href.toLowerCase().includes("privacy")
        );

    if (matches.length > 0) {
        chrome.runtime.sendMessage({
            type: "privacyPolicy:detected",
            urls: matches
        });
    }
}

// -----------------------------
// Initial delayed scan
// -----------------------------
setTimeout(() => {
    scanForPrivacyPolicy();
}, 300); // slight delay solves Google/YouTube footer load issue

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

// Stop observing when page unloads
window.addEventListener("beforeunload", () => {
    observer.disconnect();
});
