// =======================================================
// Background Service Worker (MV3-safe, Vite-compatible)
// =======================================================
import { analyzePrivacy } from "./xAIService.js";
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
// Handle popup request (includes privacy data analysis)
// -------------------------------------------------------
async function handlePopupReady(sendResponse) {
  try {
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

    // Initialize or get privacy data
    if (currentUrl !== info.fullUrl) {
      await initializePrivacyCollection(info.fullUrl);
    }

    let privacyData = null;
    let privacyScore = null;
    let privacyScoreDetails = null;

    if (privacyDataController) {
      privacyData = privacyDataController.getCurrentPrivacyData();
      
      if (privacyData) {
        // Calculate privacy score
        const scoreCalculator = new PrivacyScore(privacyData);
        scoreCalculator.calculate();
        privacyScore = scoreCalculator.score;
        privacyScoreDetails = {
          score: scoreCalculator.score,
          rating: scoreCalculator.rating,
          factors: scoreCalculator.factors,
          recommendations: scoreCalculator.recommendations
        };
      }
    }

    // Fallback to AI analysis if no privacy data collected yet
    if (!privacyScore && info.fullUrl) {
      try {
        const ai = await analyzePrivacy(info.fullUrl);
        privacyScore = ai.score;
      } catch (err) {
        console.warn("AI analysis failed, using default:", err);
      }
    }

    sendResponse({
      fullUrl: info.fullUrl,
      host: info.host,
      isSecure: info.isSecure,
      privacyScore: privacyScore,
      privacyData: privacyData ? {
        summary: privacyData.getSummary(),
        cookies: {
          total: privacyData.cookies.firstParty.length + privacyData.cookies.thirdParty.length,
          thirdParty: privacyData.cookies.thirdParty.length,
          tracking: privacyData.cookies.tracking.length
        },
        tracking: {
          scripts: privacyData.tracking.scripts.length,
          requests: privacyData.networkRequests.tracking.length
        },
        privacyPolicy: privacyData.privacyPolicy
      } : null,
      privacyScoreDetails: privacyScoreDetails,
      message: privacyScoreDetails?.recommendations?.[0]?.description || "Privacy check complete."
    });

  } catch (err) {
    console.error("handlePopupReady error:", err);
    sendResponse({
      fullUrl: null,
      host: null,
      isSecure: false,
      privacyScore: null,
      privacyData: null,
      privacyScoreDetails: null,
      message: "Error retrieving website information"
    });
  }
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

// =======================================================
// Message Listener (must NOT be async in MV3)
// =======================================================

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

  // --- Privacy policy detected by content script ---
  if (message?.type === "privacyPolicy:detected") {
    const firstUrl = message.urls?.[0];
    if (firstUrl && privacyDataController) {
      privacyDataController.setPrivacyPolicy(firstUrl);
      // setPrivacyPolicy calls notifyUpdate(), which triggers privacyData:updated
      // and will recalculate the score automatically
    }
    return; // no async response needed
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
