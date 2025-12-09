// contentScripts/privacyScanner.js

// -----------------------------
// TRACKING SCRIPT CLASSIFIER
// -----------------------------

function classifyScript(url, pageHost) {
    const lc = url.toLowerCase();
    const hostname = (() => {
        try {
            if (url.startsWith("http")) {
                return new URL(url).hostname;
            }
        } catch {}
        return pageHost; // fallback
    })();

    const isThirdParty = hostname !== pageHost;

    let category = "Site Script";
    let risk = "Low";
    let description = "General site functionality script.";

    const match = (str) => lc.includes(str);

    // Analytics
    if (match("analytics") || match("metric") || match("stats") || match("gtm")) {
        category = "Analytics Tracking";
        description = "Collects usage or engagement data.";
        risk = isThirdParty ? "Moderate" : "Low";
    }

    // Behavior / heatmap / session replay
    if (match("mouse") || match("heatmap") || match("session") || match("record")) {
        category = "Behavior Tracking";
        description = "Tracks interactions such as clicks, scroll, or mouse movement.";
        risk = "Moderate";
    }

    // Fingerprinting
    if (match("fingerprint") || match("fpjs") || match("finger")) {
        category = "Fingerprinting";
        description = "Collects device/browser attributes to identify users.";
        risk = "High";
    }

    // Ads
    if (match("adservice") || match("ads") || match("advert")) {
        category = "Advertising Tracker";
        description = "Used for targeted ads or profiling activity.";
        risk = "High";
    }

    return {
        url,
        hostname,
        isThirdParty,
        category,
        risk,
        description
    };
}

// -----------------------------
// SCRIPT COLLECTION
// -----------------------------
function collectScripts() {
    const pageHost = location.hostname;
    const scripts = Array.from(document.scripts)
        .map(s => s.src)
        .filter(src => src && src.length > 0);

    const seen = new Set();
    const details = [];

    for (const src of scripts) {
        if (seen.has(src)) continue;
        seen.add(src);

        details.push(classifyScript(src, pageHost));
    }

    chrome.runtime.sendMessage({
        type: "trackingScripts:detected",
        scripts: details
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
