// =======================================================
// Background Service Worker (MV3-safe, Vite-compatible)
// =======================================================

import { PrivacyDataController } from "../controllers/PrivacyDataController.js";
import { PrivacyScore } from "../models/PrivacyScore.js";

// Global privacy data controller instance
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
// Website processing controller
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
// Initialize privacy data collection for a URL
// -------------------------------------------------------
async function initializePrivacyCollection(url) {
  // Stop previous collection if URL changed
  if (privacyDataController && currentUrl !== url) {
    privacyDataController.stopMonitoring();
  }

  // Initialize new collection
  if (url && isValidUrl(url)) {
    privacyDataController = new PrivacyDataController();
    await privacyDataController.initializeCollection(url);
    currentUrl = url;
  }
}

// -------------------------------------------------------
// Check if URL is valid for analysis
// -------------------------------------------------------
function isValidUrl(url) {
  if (!url) return false;
  const specialProtocols = ['chrome:', 'about:', 'chrome-extension:', 'file:', 'edge:', 'brave:'];
  return !specialProtocols.some(proto => url.startsWith(proto)) && 
         (url.startsWith('http://') || url.startsWith('https://'));
}

// -------------------------------------------------------
// Handle tab updates for SPA navigation
// -------------------------------------------------------
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process when navigation is complete and tab is active
  if (changeInfo.status === 'complete' && tab?.active && tab?.url) {
    if (isValidUrl(tab.url)) {
      initializePrivacyCollection(tab.url);
    }
  }
});

// -------------------------------------------------------
// Handle tab activation
// -------------------------------------------------------
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.url && isValidUrl(tab.url)) {
      initializePrivacyCollection(tab.url);
    }
  } catch (err) {
    console.error("Tab activation error:", err);
  }
});

// -------------------------------------------------------
// Calculate and send updated privacy score
// -------------------------------------------------------
async function calculateAndSendScoreUpdate() {
  if (!privacyDataController) return;

  const privacyData = privacyDataController.getCurrentPrivacyData();
  if (!privacyData) return;

  // Calculate updated score
  const scoreCalculator = new PrivacyScore(privacyData);
  scoreCalculator.calculate();

  const scoreDetails = {
    score: scoreCalculator.score,
    rating: scoreCalculator.rating,
    factors: scoreCalculator.factors,
    recommendations: scoreCalculator.recommendations
  };

  // Send update to all popup instances
  try {
    chrome.runtime.sendMessage({
      type: "privacyScore:updated",
      privacyScore: scoreCalculator.score,
      privacyScoreDetails: scoreDetails,
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
          requests: privacyData.networkRequests.tracking.length
        },
        privacyPolicy: privacyData.privacyPolicy
      }
    }).catch(() => {
      // Ignore errors if no popup is open
    });
  } catch (err) {
    // Ignore errors
  }
}

// =======================================================
// Message Listener (must NOT be async in MV3)
// =======================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // --- Privacy data updated - recalculate score ---
  if (message?.type === "privacyData:updated") {
    // Debounce score recalculation to avoid too many updates
    if (calculateAndSendScoreUpdate.timeout) {
      clearTimeout(calculateAndSendScoreUpdate.timeout);
    }
    calculateAndSendScoreUpdate.timeout = setTimeout(() => {
      calculateAndSendScoreUpdate();
    }, 300); // Wait 300ms for more data to accumulate
    return; // no async response needed
  }

  // --- Privacy policy detected by content script (link scan) ---
  if (message?.type === "privacyPolicy:detected") {
    const firstUrl = message.urls?.[0];
    if (firstUrl && privacyDataController) {
      privacyDataController.setPrivacyPolicy(firstUrl);
      // setPrivacyPolicy calls notifyUpdate(), which triggers privacyData:updated
      // and will recalculate the score automatically
    }
    return; // no async response needed
  }

  // --- Scraped policy text from policyScraper.js ---
if (message?.type === "privacyPolicy:textScraped") {
    const policyUrl = message.policyUrl;
    const text = message.text;

    chrome.storage.local.get("privacyPolicyTexts", (stored) => {
        const all = stored?.privacyPolicyTexts || {};
        all[policyUrl] = text;  // STORE BY FULL URL

        chrome.storage.local.set({ privacyPolicyTexts: all }, () => {
            console.log("Stored policy text for:", policyUrl);
        });
    });

    return; 
}



  // --- Request to auto-scrape policy page in background tab ---
if (message?.type === "privacyPolicy:autoScrape") {
  if (!message.url) return;

  console.log("[BG] Auto-scrape requested for:", message.url);

  chrome.tabs.create({ url: message.url, active: false }, (tab) => {
    if (!tab || !tab.id) {
      console.warn("[BG] Failed to create tab for auto-scrape");
      return;
    }

    console.log("[BG] Created background tab", tab.id, "for", message.url);

    function handleUpdated(tabId, changeInfo, updatedTab) {
      if (tabId !== tab.id) return;
      if (changeInfo.status !== "complete") return;

      console.log("[BG] Tab finished loading, injecting scraper into", updatedTab.url);
      chrome.tabs.onUpdated.removeListener(handleUpdated);

      // Inject policyScraper.js manually into this tab
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: ["contentScripts/policyScraper.js"]
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("[BG] Injection error:", chrome.runtime.lastError.message);
          } else {
            console.log("[BG] policyScraper injected into tab", tab.id);
          }

          // Close after giving scraper time to run & send its message
          setTimeout(() => {
            console.log("[BG] Closing auto-scrape tab", tab.id);
            chrome.tabs.remove(tab.id);
          }, 4000);
        }
      );
    }

    chrome.tabs.onUpdated.addListener(handleUpdated);
  });

  return true; // keep service worker alive during async work
}

  // --- Popup requesting data ---
  if (message?.type === "popup:ready") {

    // --- WAIT + RETRY MECHANISM ---
    const MAX_RETRIES = 5;
    let attempts = 0;

    const attemptResponse = async () => {
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

      // Ensure controller initialized
      if (!privacyDataController || currentUrl !== info.fullUrl) {
        await initializePrivacyCollection(info.fullUrl);
      }

      // Delay to let network/DOM settle
      await new Promise(r => setTimeout(r, 150));

      let privacyData = privacyDataController?.getCurrentPrivacyData();

      // Retry if missing key pieces
      if (
        attempts < MAX_RETRIES &&
        (
          !privacyData ||
          !privacyData.privacyPolicy ||
          privacyData.networkRequests.tracking.length === 0
        )
      ) {
        return attemptResponse();
      }

      // --- Compute score ---
      let privacyScore = null;
      let details = null;

      if (privacyData) {
        const calc = new PrivacyScore(privacyData);
        calc.calculate();
        privacyScore = calc.score;
        details = {
          score: calc.score,
          rating: calc.rating,
          factors: calc.factors,
          recommendations: calc.recommendations
        };
      }

      sendResponse({
        fullUrl: info.fullUrl,
        host: info.host,
        isSecure: info.isSecure,
        privacyScore,
        privacyData: privacyData ? {
          summary: privacyData.getSummary(),
          cookies: {
            total:
              privacyData.cookies.firstParty.length +
              privacyData.cookies.thirdParty.length,
            thirdParty: privacyData.cookies.thirdParty.length,
            tracking: privacyData.cookies.tracking.length
          },
          tracking: {
            scripts: privacyData.tracking.scripts.length,
            requests: privacyData.networkRequests.tracking.length
          },
          privacyPolicy: privacyData.privacyPolicy
        } : null,
        privacyScoreDetails: details,
        message: details?.recommendations?.[0]?.description ||
          "Privacy check complete."
      });
    };

    // Start first attempt
    attemptResponse();

    return true; // keep port open for async sendResponse()
  }
});
