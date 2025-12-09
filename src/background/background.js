// =======================================================
// Background Service Worker (MV3-safe, Vite-compatible)
// =======================================================

import { PrivacyDataController } from "../controllers/PrivacyDataController.js";
import { PrivacyScore } from "../models/PrivacyScore.js";

let privacyDataController = null;
let currentUrl = null;

// -------------------------------------------------------
// Get active tab
// -------------------------------------------------------
async function getActiveTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab || null;
    } catch (err) {
        console.error("getActiveTab error:", err);
        return null;
    }
}

// -------------------------------------------------------
// Extract hostname safely
// -------------------------------------------------------
function extractHost(url) {
    try {
        return new URL(url).hostname || null;
    } catch {
        return null;
    }
}

// -------------------------------------------------------
// Detect URL + hostname
// -------------------------------------------------------
async function detectURL() {
    const tab = await getActiveTab();
    const url = tab?.url || null;
    const host = url ? extractHost(url) : null;

    return {
        url,
        domainDisplay: host,
        tabId: tab?.id ?? null,
    };
}

// -------------------------------------------------------
// Website controller
// -------------------------------------------------------
class WebsiteController {
    static async processWebsite() {
        try {
            const { url, domainDisplay } = await detectURL();
            return {
                fullUrl: url,
                host: domainDisplay,
                isSecure: url?.startsWith("https://") ?? false,
            };
        } catch (err) {
            console.error("WebsiteController error:", err);
            return { fullUrl: null, host: null, isSecure: false };
        }
    }
}

// -------------------------------------------------------
// Check if URL is valid for analysis
// -------------------------------------------------------
function isValidUrl(url) {
    if (!url) return false;
    const special = ['chrome:', 'about:', 'chrome-extension:', 'file:', 'edge:', 'brave:'];
    return !special.some(proto => url.startsWith(proto)) &&
           (url.startsWith('http://') || url.startsWith('https://'));
}

// -------------------------------------------------------
// Initialize privacy data collection for a URL
// -------------------------------------------------------
async function initializePrivacyCollection(url) {
    if (privacyDataController && currentUrl !== url) {
        privacyDataController.stopMonitoring();
    }

    if (url && isValidUrl(url)) {
        privacyDataController = new PrivacyDataController();
        await privacyDataController.initializeCollection(url);
        currentUrl = url;
    }
}

// SPA navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab?.active && tab?.url) {
        if (isValidUrl(tab.url)) {
            initializePrivacyCollection(tab.url);
        }
    }
});

// Tab activation
chrome.tabs.onActivated.addListener(async info => {
    try {
        const tab = await chrome.tabs.get(info.tabId);
        if (tab?.url && isValidUrl(tab.url)) {
            initializePrivacyCollection(tab.url);
        }
    } catch (err) {
        // ignore
    }
});

// -------------------------------------------------------
// Calculate and send privacy score update
// -------------------------------------------------------
async function calculateAndSendScoreUpdate() {
    if (!privacyDataController) return;

    const privacyData = privacyDataController.getCurrentPrivacyData();
    if (!privacyData) return;

    const scoreCalc = new PrivacyScore(privacyData);
    scoreCalc.calculate();

    try {
        chrome.runtime.sendMessage({
            type: "privacyScore:updated",
            privacyScore: scoreCalc.score,
            privacyScoreDetails: {
                score: scoreCalc.score,
                rating: scoreCalc.rating,
                factors: scoreCalc.factors,
                recommendations: scoreCalc.recommendations,
            },
            privacyData: {
                summary: privacyData.getSummary(),
                cookies: {
                    total: privacyData.cookies.firstParty.length +
                           privacyData.cookies.thirdParty.length,
                    thirdParty: privacyData.cookies.thirdParty.length,
                    tracking: privacyData.cookies.tracking.length
                },
                tracking: {
                    scripts: privacyData.tracking.scripts.length,
                    requests: privacyData.networkRequests.tracking.length,
                    scriptDetails: privacyData.tracking.scriptDetails || []
                },
                privacyPolicy: privacyData.privacyPolicy
            }
        }).catch(() => {});
    } catch (err) {
        // ignore if no listeners
    }
}

// =======================================================
// MESSAGE LISTENER
// =======================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    // --- Tracking script details from content script ---
    if (msg?.type === "trackingScripts:detected") {
        if (privacyDataController && msg.scripts) {
            privacyDataController.addScriptDetails(msg.scripts);
        }
        return;
    }

    // --- Privacy data updated: debounce score recompute ---
    if (msg?.type === "privacyData:updated") {
        if (calculateAndSendScoreUpdate.timeout) {
            clearTimeout(calculateAndSendScoreUpdate.timeout);
        }
        calculateAndSendScoreUpdate.timeout = setTimeout(() => {
            calculateAndSendScoreUpdate();
        }, 300);
        return;
    }

    // --- Privacy policy detected by content script (link scan) ---
    if (msg?.type === "privacyPolicy:detected") {
        if (privacyDataController) {
            const firstUrl = msg.urls?.[0];
            if (firstUrl) {
                privacyDataController.setPrivacyPolicy(firstUrl);
            }
        }
        return;
    }

    // --- Scraped policy text from policyScraper.js ---
    if (msg?.type === "privacyPolicy:textScraped") {
        const policyUrl = msg.policyUrl;
        const text = msg.text;

        if (!policyUrl || !text) return;

        chrome.storage.local.get("privacyPolicyTexts", (stored) => {
            const all = stored?.privacyPolicyTexts || {};
            all[policyUrl] = text;

            chrome.storage.local.set({ privacyPolicyTexts: all }, () => {
                console.log("[BG] Stored policy text for:", policyUrl);
            });
        });

        return;
    }

    // --- Request to auto-scrape policy page in background tab ---
    if (msg?.type === "privacyPolicy:autoScrape") {
        if (!msg.url) return;

        console.log("[BG] Auto-scrape requested for:", msg.url);

        chrome.tabs.create({ url: msg.url, active: false }, (tab) => {
            if (!tab || !tab.id) {
                console.warn("[BG] Failed to create tab for auto-scrape");
                return;
            }

            const scraperTabId = tab.id;
            console.log("[BG] Created background tab", scraperTabId);

            let alreadyClosed = false;

            function cleanClose() {
                if (alreadyClosed) return;
                alreadyClosed = true;

                chrome.tabs.remove(scraperTabId, () => {
                    if (chrome.runtime.lastError) {
                        // e.g. "No tab with id"
                        return;
                    }
                });
            }

            function handleUpdated(tabId, changeInfo) {
                if (tabId !== scraperTabId) return;
                if (changeInfo.status !== "complete") return;

                chrome.tabs.onUpdated.removeListener(handleUpdated);
                console.log("[BG] Tab finished loading -> injecting scraper");

                chrome.scripting.executeScript(
                    {
                        target: { tabId: scraperTabId },
                        files: ["contentScripts/policyScraper.js"]
                    },
                    () => {
                        if (chrome.runtime.lastError) {
                            console.error("[BG] Injection error:", chrome.runtime.lastError.message);
                            cleanClose();
                            return;
                        }
                        console.log("[BG] policyScraper injected");
                    }
                );

                const listener = (innerMsg) => {
                    if (innerMsg?.type === "privacyPolicy:textScraped") {
                        chrome.runtime.onMessage.removeListener(listener);

                        console.log("[BG] Received scraped text for:", innerMsg.policyUrl);

                        chrome.storage.local.get("privacyPolicyTexts", (stored) => {
                            const all = stored?.privacyPolicyTexts || {};
                            all[innerMsg.policyUrl] = innerMsg.text;

                            chrome.storage.local.set({ privacyPolicyTexts: all }, () => {
                                console.log("[BG] Stored policy text (autoscrape).");

                                // Notify popup (PopupController.waitForFinalUrl listens for this)
                                chrome.runtime.sendMessage({
                                    type: "policyScrape:complete",
                                    finalUrl: innerMsg.policyUrl
                                });

                                cleanClose();
                            });
                        });
                    }
                };

                chrome.runtime.onMessage.addListener(listener);

                // Safety timeout: close tab even if scraper fails to respond
                setTimeout(cleanClose, 5000);
            }

            chrome.tabs.onUpdated.addListener(handleUpdated);
        });

        return true; // keep message channel open if needed
    }

    // --- Popup requesting data ---
    if (msg?.type === "popup:ready") {
        const MAX_RETRIES = 5;
        let attempts = 0;

        const attempt = async () => {
            attempts++;

            const info = await WebsiteController.processWebsite();
            if (!info.fullUrl || !isValidUrl(info.fullUrl)) {
                sendResponse({
                    fullUrl: info.fullUrl,
                    host: info.host,
                    isSecure: info.isSecure,
                    privacyScore: null,
                    privacyData: null,
                    privacyScoreDetails: null,
                    message: "Cannot analyze this page type"
                });
                return;
            }

            if (!privacyDataController || currentUrl !== info.fullUrl) {
                await initializePrivacyCollection(info.fullUrl);
            }

            await new Promise(r => setTimeout(r, 150));

            const privacyData = privacyDataController.getCurrentPrivacyData();
            if ((!privacyData) && attempts < MAX_RETRIES) {
                return attempt();
            }

            if (!privacyData) {
                sendResponse({
                    fullUrl: info.fullUrl,
                    host: info.host,
                    isSecure: info.isSecure,
                    privacyScore: null,
                    privacyData: null,
                    privacyScoreDetails: null,
                    message: "No privacy data collected."
                });
                return;
            }

            const scoreCalc = new PrivacyScore(privacyData);
            scoreCalc.calculate();

            sendResponse({
                fullUrl: info.fullUrl,
                host: info.host,
                isSecure: info.isSecure,
                privacyScore: scoreCalc.score,
                privacyData: {
                    summary: privacyData.getSummary(),
                    cookies: {
                        total: privacyData.cookies.firstParty.length +
                               privacyData.cookies.thirdParty.length,
                        thirdParty: privacyData.cookies.thirdParty.length,
                        tracking: privacyData.cookies.tracking.length
                    },
                    tracking: {
                        scripts: privacyData.tracking.scripts.length,
                        requests: privacyData.networkRequests.tracking.length,
                        scriptDetails: privacyData.tracking.scriptDetails || []
                    },
                    privacyPolicy: privacyData.privacyPolicy
                },
                privacyScoreDetails: {
                    score: scoreCalc.score,
                    rating: scoreCalc.rating,
                    factors: scoreCalc.factors,
                    recommendations: scoreCalc.recommendations
                },
                message: "Privacy check complete."
            });
        };

        attempt();
        return true; // async sendResponse
    }
});
