// contentScripts/privacyScanner.js

// -----------------------------
// SCRIPT COLLECTION
// -----------------------------
function collectScripts() {
    const pageHost = location.hostname;
    const scripts = Array.from(document.scripts)
        .map(s => s.src)
        .filter(src => src && src.length > 0);

    const unique = Array.from(new Set(scripts));

    chrome.runtime.sendMessage({
        type: "trackingScripts:detected",
        pageHost,
        scripts: unique
    });
}



// -----------------------------
// PRIVACY POLICY DETECTION
// -----------------------------
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
            urls: Array.from(new Set(matches))
        });
    }
}


// -----------------------------
// INITIAL SCAN
// -----------------------------
setTimeout(() => {
    scanForPrivacyPolicy();
    collectScripts();
}, 300);


// -----------------------------
// OBSERVE DOM CHANGES
// -----------------------------
const observer = new MutationObserver(() => {
    scanForPrivacyPolicy();
    collectScripts();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

window.addEventListener("beforeunload", () => observer.disconnect());
