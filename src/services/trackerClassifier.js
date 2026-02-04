// src/services/trackerClassifier.js
// Centralized tracker classification using a local tracker map.
// Goal: plain-English output + risk buckets (High / Low / None).
// No network calls. Keep logic minimal and explainable.

import { TRACKER_MAP } from "../data/trackerList.js";

const RISK_ORDER = ["High", "Low", "None"];

const CATEGORY_RISK = {
  Fingerprinting: "High",
  Ads: "High",
  Behavior: "High",
  Social: "Low",
  Analytics: "Low",
  CDN: "None",
  Utility: "None",
};

const CATEGORY_PURPOSE = {
  Ads: "Shows ads and profiles what you view for targeting.",
  Analytics: "Measures visits and usage patterns.",
  Social: "Tracks visits for social widgets or logins.",
  Fingerprinting: "Tries to identify your device or browser uniquely.",
  Behavior: "Records on-page behavior like clicks or mouse movement.",
  CDN: "Delivers assets; typically infrastructure-only.",
  Utility: "Site helper scripts with low tracking impact.",
};

/**
 * Plain English reason string so non-technical users understand why a risk was chosen.
 */
function buildWhy({ matched, isThirdParty, category, prevalence, heuristicReason }) {
  if (heuristicReason) return heuristicReason;

  const parts = [];
  if (matched?.owner) parts.push(`Known tracker from ${matched.owner}`);
  if (category) parts.push(`Category: ${category}`);
  if (isThirdParty) parts.push("Runs on another company’s domain");
  if (prevalence >= 0.3) parts.push("Very common tracker seen on many sites");
  return parts.join(". ") || "No clear signals.";
}

/**
 * Very small heuristic fallback for unknown domains.
 */
function heuristicFallback(url, domain, isThirdParty) {
  const lc = url.toLowerCase();
  const suspicious =
    lc.includes("/collect") ||
    lc.includes("track") ||
    lc.includes("pixel") ||
    lc.includes("beacon") ||
    lc.includes("session");

  if (!suspicious) {
    return {
      category: isThirdParty ? "Analytics" : "Utility",
      risk: isThirdParty ? "Low" : "None",
      purpose: isThirdParty
        ? "Looks like a third-party helper script."
        : "Looks like a site helper script.",
      why: isThirdParty
        ? "No known tracker match, but runs from another domain."
        : "No known tracker match; appears first-party.",
    };
  }

  const risk = isThirdParty ? "High" : "Low";
  return {
    category: "Behavior",
    risk,
    purpose: "Possible tracking or analytics based on the URL path.",
    why: isThirdParty
      ? "Suspicious tracking terms in a third-party script URL."
      : "Suspicious tracking terms in a site script URL.",
  };
}

/**
 * Normalize a URL into domain + metadata lookup.
 */
function lookupTracker(domain) {
  if (!domain) return null;
  const lc = domain.toLowerCase();
  if (TRACKER_MAP[lc]) return TRACKER_MAP[lc];
  // Also check eTLD-ish suffix matches (e.g., cdn.doubleclick.net)
  const parts = lc.split(".");
  for (let i = 1; i < parts.length - 1; i += 1) {
    const candidate = parts.slice(i).join(".");
    if (TRACKER_MAP[candidate]) return TRACKER_MAP[candidate];
  }
  return null;
}

/**
 * Turn a single script URL into a ScriptFinding.
 */
export function classifyScript(url, pageHost, source = "Script") {
  if (!url) return null;

  let domain = null;
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = pageHost || null;
  }

  const isThirdParty = domain && pageHost ? domain !== pageHost : false;
  const matched = lookupTracker(domain);

  if (matched) {
    const category = matched.category || "Analytics";
    const risk = CATEGORY_RISK[category] || "Low";
    return {
      url,
      domain,
      isThirdParty,
      source,
      owner: matched.owner || "Unknown vendor",
      category,
      purpose: matched.purpose || CATEGORY_PURPOSE[category] || "Tracker script.",
      risk,
      riskOrder: RISK_ORDER.indexOf(risk),
      prevalence: matched.prevalence ?? 0,
      why: buildWhy({ matched, isThirdParty, category, prevalence: matched.prevalence }),
    };
  }

  const fallback = heuristicFallback(url, domain, isThirdParty);
  return {
    url,
    domain,
    isThirdParty,
    source,
    owner: "Unknown vendor",
    category: fallback.category,
    purpose: fallback.purpose,
    risk: fallback.risk,
    riskOrder: RISK_ORDER.indexOf(fallback.risk),
    prevalence: 0,
    why: fallback.why,
  };
}

/**
 * Classify a list of script URLs. Input may be strings or { url } objects.
 */
export function classifyScripts(items = [], pageHost = null, source = "Script") {
  const dedup = new Set();
  const results = [];

  items.forEach((item) => {
    const url = typeof item === "string" ? item : item?.url;
    if (!url || dedup.has(url)) return;
    dedup.add(url);

    const finding = classifyScript(url, pageHost, source);
    if (finding) results.push(finding);
  });

  // Sort so High risk is shown first, then Low, then None.
  return results.sort((a, b) => {
    if (a.riskOrder !== b.riskOrder) return a.riskOrder - b.riskOrder;
    if (a.prevalence !== b.prevalence) return b.prevalence - a.prevalence;
    return a.url.localeCompare(b.url);
  });
}
