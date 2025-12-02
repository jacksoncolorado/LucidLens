// =======================================================
// Background Service Worker (MV3-safe, Vite-compatible)
// =======================================================
import { analyzePrivacy } from "./xAIService.js";

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
// Handle popup request (includes AI privacy analysis)
// -------------------------------------------------------

async function handlePopupReady(sendResponse) {
  try {
    const info = await WebsiteController.processWebsite();

    // --- call xAI here ---
    const ai = await analyzePrivacy(info.fullUrl);

    sendResponse({
      fullUrl: info.fullUrl,
      host: info.host,
      isSecure: info.isSecure,
      privacyScore: ai.score,
      message: ai.summary || "Privacy check complete."
    });

  } catch (err) {
    console.error("handlePopupReady error:", err);
    sendResponse({
      fullUrl: null,
      host: null,
      isSecure: false,
      privacyScore: null,
      message: "Error retrieving website information"
    });
  }
}


// =======================================================
// Message Listener (must NOT be async in MV3)
// =======================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "popup:ready") {
    handlePopupReady(sendResponse);
    return true; // keep message channel open for async response
  }
});
