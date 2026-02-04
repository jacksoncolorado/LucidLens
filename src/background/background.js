// =================================================================================================
//  LucidLens - Background Service Worker (Manifest V3)
// =================================================================================================
//
//  Mental model (keep this in your head):
//    - Content scripts “discover” things on the page and message the background.
//    - Background owns the ONE controller instance for the current URL.
//    - Background computes PrivacyScore and pushes updates to the popup.
//    - Popup asks background for a snapshot when it opens.
//
//  IMPORTANT: MV3 service worker can sleep/restart.
//    - Any in-memory vars below reset when the worker restarts.
//    - That’s why we re-initialize when needed.
//
// =================================================================================================

import { PrivacyDataController } from "../controllers/PrivacyDataController.js";
import { PrivacyScore } from "../models/PrivacyScore.js";
import { classifyScripts } from "../services/trackerClassifier.js";

// -------------------------------------------------------------------------------------------------
//  STATE (in-memory while service worker is alive)
// -------------------------------------------------------------------------------------------------

let privacyDataController = null;
// ^ null = no controller instance exists yet (or service worker restarted)

let currentUrl = null;
// ^ null = we haven't started monitoring any URL yet (or service worker restarted)

let scoreUpdateTimerId = null;
// ^ null = no scheduled “debounced” score update is pending


// -------------------------------------------------------------------------------------------------
//  SECTION 1 — TAB + URL HELPERS
// -------------------------------------------------------------------------------------------------

/**
 * getActiveTab()
 * Calls: chrome.tabs.query({ active: true, currentWindow: true })
 * Returns: the active tab object, or null if none/error.
 */
async function getActiveTab() {
  try {
    // chrome.tabs.query returns an array; [tab] grabs the first match.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  } catch (err) {
    console.error("[BG] getActiveTab error:", err);
    return null;
  }
}

/**
 * extractHost(url)
 * Purpose: safely convert a URL string into a hostname ("cnn.com").
 */
function extractHost(url) {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/**
 * isValidUrl(url)
 * Purpose: ignore internal browser pages and only analyze http(s).
 */
function isValidUrl(url) {
  if (!url) return false;

  const blockedPrefixes = [
    "chrome:",
    "about:",
    "chrome-extension:",
    "file:",
    "edge:",
    "brave:",
  ];

  if (blockedPrefixes.some((p) => url.startsWith(p))) return false;

  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * detectCurrentSite()
 * Purpose: collect the “current page identity” in one place.
 *
 * JS syntax notes you’ll see:
 *   - tab?.url         optional chaining (prevents crash if tab is null)
 *   - x || null        normalize undefined -> null
 *   - x ?? fallback    only uses fallback when x is null/undefined
 */
async function detectCurrentSite() {
  const tab = await getActiveTab();

  const url = tab?.url || null;
  // ^ null = no active tab URL available (internal page, permission, or no tab)

  return {
    url,
    host: url ? extractHost(url) : null, // host becomes null when url is null
    isSecure: url?.startsWith("https://") ?? false,
    tabId: tab?.id ?? null,
  };
}


// -------------------------------------------------------------------------------------------------
//  SECTION 2 — MONITORING LIFECYCLE (start/stop PrivacyDataController)
// -------------------------------------------------------------------------------------------------

/**
 * initializePrivacyCollection(url)
 * Purpose: ensure we are monitoring EXACTLY this URL (and only this URL).
 *
 * Calls:
 *   - privacyDataController.stopMonitoring() when switching sites
 *   - privacyDataController.initializeCollection(url) to begin tracking
 */
async function initializePrivacyCollection(url) {
  // If we were monitoring a different site, stop old monitoring first.
  if (privacyDataController && currentUrl !== url) {
    try {
      privacyDataController.stopMonitoring();
    } catch {
      // ignore cleanup errors
    }
  }

  // Do nothing on invalid pages (chrome:// etc.).
  if (!url || !isValidUrl(url)) return;

  // Start a fresh controller instance for this URL.
  privacyDataController = new PrivacyDataController();
  await privacyDataController.initializeCollection(url);

  // Remember which URL we are currently monitoring.
  currentUrl = url;
}


// -------------------------------------------------------------------------------------------------
//  SECTION 3 — TAB EVENTS (when to start monitoring)
// -------------------------------------------------------------------------------------------------
//
// Why both listeners exist:
//   - onUpdated: catches reloads & navigations finishing
//   - onActivated: catches switching between tabs

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when the tab finished loading.
  if (changeInfo.status !== "complete") return;

  // Only act on the ACTIVE tab (the one user is looking at).
  if (!tab?.active || !tab?.url) return;

  if (isValidUrl(tab.url)) {
    initializePrivacyCollection(tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (info) => {
  try {
    const tab = await chrome.tabs.get(info.tabId);
    if (tab?.url && isValidUrl(tab.url)) {
      initializePrivacyCollection(tab.url);
    }
  } catch {
    // ignore
  }
});


// -------------------------------------------------------------------------------------------------
//  SECTION 4 — SCORE COMPUTATION + PUSH UPDATES TO POPUP
// -------------------------------------------------------------------------------------------------

/**
 * calculateAndSendScoreUpdate()
 * Purpose:
 *   1) pull latest PrivacyData from controller
 *   2) compute PrivacyScore
 *   3) send a “privacyScore:updated” message to popup
 */
async function calculateAndSendScoreUpdate() {
  if (!privacyDataController) return; // controller not running yet

  const privacyData = privacyDataController.getCurrentPrivacyData();
  if (!privacyData) return; // controller exists, but hasn't produced data yet

  // Compute score from the collected data snapshot.
  const scoreCalc = new PrivacyScore(privacyData);
  scoreCalc.calculate();

  try {
    // MV3 sendMessage returns a Promise.
    // If popup is closed, there may be no listener and the Promise can reject.
    await chrome.runtime.sendMessage({
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
          total:
            privacyData.cookies.firstParty.length +
            privacyData.cookies.thirdParty.length,
          thirdParty: privacyData.cookies.thirdParty.length,
          tracking: privacyData.cookies.tracking.length,
        },

        tracking: {
          scripts: privacyData.tracking.scripts.length,
          requests: privacyData.networkRequests.tracking.length,
          scriptDetails: privacyData.tracking.scriptDetails || [],
          // ^ || [] = if scriptDetails is undefined/null, show empty list in UI
        },

        privacyPolicy: privacyData.privacyPolicy,
      },
    });
  } catch {
    // popup likely not open; ignore
  }
}

/**
 * scheduleScoreUpdateDebounced(delayMs)
 * Purpose: avoid recalculating score too frequently during rapid updates.
 */
function scheduleScoreUpdateDebounced(delayMs = 300) {
  if (scoreUpdateTimerId) clearTimeout(scoreUpdateTimerId);

  scoreUpdateTimerId = setTimeout(() => {
    scoreUpdateTimerId = null; // null = no longer pending
    calculateAndSendScoreUpdate();
  }, delayMs);
}


// -------------------------------------------------------------------------------------------------
//  SECTION 5 — STORAGE HELPER (policy text cache)
// -------------------------------------------------------------------------------------------------

/**
 * storePolicyText(policyUrl, text)
 * Purpose: save scraped policy text in chrome.storage.local under a map:
 *   privacyPolicyTexts = { [policyUrl]: text }
 */
function storePolicyText(policyUrl, text, logLabel = "") {
  if (!policyUrl || !text) return;

  // storage.get is callback-based (not await), so we pass a function.
  chrome.storage.local.get("privacyPolicyTexts", (stored) => {
    const all = stored?.privacyPolicyTexts || {};
    all[policyUrl] = text;

    chrome.storage.local.set({ privacyPolicyTexts: all }, () => {
      if (logLabel) console.log(`[BG] Stored policy text ${logLabel}:`, policyUrl);
    });
  });
}


// =================================================================================================
//  SECTION 6 — MESSAGE LISTENER (content scripts + popup -> background)
// =================================================================================================
//
// Background receives messages. Each message has a "type" string.
//
// Big rule:
//   - If you will call sendResponse() later (async), you MUST `return true`
//     so Chrome keeps the message channel open.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ----------------------------------------------------------------------------------------------
  // (1) Content script -> background: tracking script details detected
  // ----------------------------------------------------------------------------------------------
  if (msg?.type === "trackingScripts:detected") {
    if (privacyDataController && msg.scripts) {
      const pageHost =
        msg.pageHost ||
        (currentUrl
          ? (() => {
              try {
                return new URL(currentUrl).hostname;
              } catch {
                return null;
              }
            })()
          : null);

      // Classify scripts using local tracker map for plain-English risk.
      const findings = classifyScripts(msg.scripts, pageHost, "Script");
      privacyDataController.addScriptDetails(findings);
    }
    return; // no response needed
  }

  // ----------------------------------------------------------------------------------------------
  // (2) Controller -> background: data updated (recompute score, but debounce it)
  // ----------------------------------------------------------------------------------------------
  if (msg?.type === "privacyData:updated") {
    scheduleScoreUpdateDebounced(300);
    return;
  }

  // ----------------------------------------------------------------------------------------------
  // (3) Content script -> background: privacy policy links detected on the page
  // ----------------------------------------------------------------------------------------------
  if (msg?.type === "privacyPolicy:detected") {
    if (privacyDataController) {
      const firstUrl = msg.urls?.[0];
      if (firstUrl) privacyDataController.setPrivacyPolicy(firstUrl);
    }
    return;
  }

  // ----------------------------------------------------------------------------------------------
  // (4) policyScraper.js -> background: scraped policy text from a policy page
  // ----------------------------------------------------------------------------------------------
  if (msg?.type === "privacyPolicy:textScraped") {
    storePolicyText(msg.policyUrl, msg.text, "(manual scrape)");
    return;
  }

  // ----------------------------------------------------------------------------------------------
  // (5) Popup -> background: request “autoscrape” (open hidden tab, inject scraper, store result)
  // ----------------------------------------------------------------------------------------------
  if (msg?.type === "privacyPolicy:autoScrape") {
    if (!msg.url) return;

    console.log("[BG] Auto-scrape requested for:", msg.url);

    chrome.tabs.create({ url: msg.url, active: false }, (tab) => {
      if (!tab?.id) {
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
          void chrome.runtime.lastError; // ignore “no tab with id”
        });
      }

      // Wait for the hidden tab to finish loading before injecting the scraper.
      function handleUpdated(tabId, changeInfo) {
        if (tabId !== scraperTabId) return;
        if (changeInfo.status !== "complete") return;

        chrome.tabs.onUpdated.removeListener(handleUpdated);
        console.log("[BG] Policy tab loaded -> injecting policyScraper");

        // Inject contentScripts/policyScraper.js into that hidden tab.
        chrome.scripting.executeScript(
          {
            target: { tabId: scraperTabId },
            files: ["contentScripts/policyScraper.js"],
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

        // Listen for the injected scraper to respond with scraped text.
        const listener = (innerMsg) => {
          if (innerMsg?.type !== "privacyPolicy:textScraped") return;

          // Remove listener so it does not fire again later.
          chrome.runtime.onMessage.removeListener(listener);

          storePolicyText(innerMsg.policyUrl, innerMsg.text, "(autoscrape)");

          // Notify popup that autoscrape finished.
          chrome.runtime
            .sendMessage({ type: "policyScrape:complete", finalUrl: innerMsg.policyUrl })
            .catch(() => {});

          cleanClose();
        };

        chrome.runtime.onMessage.addListener(listener);

        // Safety: close the hidden tab even if scraper never responds.
        setTimeout(cleanClose, 5000);
      }

      chrome.tabs.onUpdated.addListener(handleUpdated);
    });

    return true; // keep message channel open for async work
  }

  // ----------------------------------------------------------------------------------------------
  // (6) Popup -> background: popup opened; request current snapshot
  // ----------------------------------------------------------------------------------------------
  if (msg?.type === "popup:ready") {
    const MAX_RETRIES = 5;
    let attempts = 0;

    const attempt = async () => {
      attempts++;

      const info = await detectCurrentSite();

      if (!info.url || !isValidUrl(info.url)) {
        sendResponse({
          fullUrl: info.url,
          host: info.host,
          isSecure: info.isSecure,
          privacyScore: null,
          privacyData: null,
          privacyScoreDetails: null,
          message: "Cannot analyze this page type",
        });
        return;
      }

      // If controller is missing or monitoring a different URL, start it.
      if (!privacyDataController || currentUrl !== info.url) {
        await initializePrivacyCollection(info.url);
      }

      // Small delay to allow initial data collection.
      await new Promise((r) => setTimeout(r, 150));

      const privacyData = privacyDataController?.getCurrentPrivacyData();

      // If data isn’t ready yet, retry a few times.
      if (!privacyData && attempts < MAX_RETRIES) {
        return attempt();
      }

      if (!privacyData) {
        sendResponse({
          fullUrl: info.url,
          host: info.host,
          isSecure: info.isSecure,
          privacyScore: null,
          privacyData: null,
          privacyScoreDetails: null,
          message: "No privacy data collected.",
        });
        return;
      }

      // Score calculation for initial popup render.
      const scoreCalc = new PrivacyScore(privacyData);
      scoreCalc.calculate();

      sendResponse({
        fullUrl: info.url,
        host: info.host,
        isSecure: info.isSecure,
        privacyScore: scoreCalc.score,

        privacyData: {
          summary: privacyData.getSummary(),
          cookies: {
            total:
              privacyData.cookies.firstParty.length +
              privacyData.cookies.thirdParty.length,
            thirdParty: privacyData.cookies.thirdParty.length,
            tracking: privacyData.cookies.tracking.length,
          },
          tracking: {
            scripts: privacyData.tracking.scripts.length,
            requests: privacyData.networkRequests.tracking.length,
            scriptDetails: privacyData.tracking.scriptDetails || [],
          },
          privacyPolicy: privacyData.privacyPolicy,
        },

        privacyScoreDetails: {
          score: scoreCalc.score,
          rating: scoreCalc.rating,
          factors: scoreCalc.factors,
          recommendations: scoreCalc.recommendations,
        },

        message: "Privacy check complete.",
      });
    };

    attempt();
    return true; // REQUIRED because we call sendResponse later (async)
  }

  // Unknown message types are ignored.
});
