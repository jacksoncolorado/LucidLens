// scripts/updateTrackerData.js
// Fetch tracker metadata from DuckDuckGo Tracker Radar and regenerate
// src/data/trackerList.js in the simplified shape this extension uses.
// Run: npm run update:trackers
//
// Notes:
// - Manual/offline updater; extension never calls the network at runtime.
// - If download fails, we fall back to a small built-in seed list.
// - We use domain_map + entity_map from tracker-radar. Categories are coarse.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN_MAP_URL =
  "https://raw.githubusercontent.com/duckduckgo/tracker-radar/master/build-data/generated/domain_map.json";
const ENTITY_MAP_URL =
  "https://raw.githubusercontent.com/duckduckgo/tracker-radar/master/build-data/generated/entity_map.json";

const OUTPUT = path.resolve(__dirname, "..", "src", "data", "trackerList.js");

// Minimal seed map so we never end up empty when offline.
const BASE_MAP = {
  "doubleclick.net": {
    owner: "Google",
    category: "Ads",
    purpose: "Serves and measures targeted advertising across sites.",
    prevalence: 0.8,
  },
  "googlesyndication.com": {
    owner: "Google",
    category: "Ads",
    purpose: "Displays and personalizes ads from Google ad network.",
    prevalence: 0.75,
  },
  "googleadservices.com": {
    owner: "Google",
    category: "Ads",
    purpose: "Ad click measurement and conversion tracking.",
    prevalence: 0.6,
  },
  "googletagmanager.com": {
    owner: "Google",
    category: "Analytics",
    purpose: "Hosts tags that load analytics/marketing trackers.",
    prevalence: 0.9,
  },
  "google-analytics.com": {
    owner: "Google",
    category: "Analytics",
    purpose: "Measures site traffic and user behavior.",
    prevalence: 0.95,
  },
  "gstatic.com": {
    owner: "Google",
    category: "CDN",
    purpose: "Static asset delivery; usually low-risk hosting.",
    prevalence: 0.9,
  },
  "facebook.net": {
    owner: "Meta",
    category: "Social",
    purpose: "Social widgets and tracking pixels for ads/retargeting.",
    prevalence: 0.85,
  },
  "facebook.com": {
    owner: "Meta",
    category: "Social",
    purpose: "Social plugins and login; can track visits for ads.",
    prevalence: 0.85,
  },
  "connect.facebook.net": {
    owner: "Meta",
    category: "Social",
    purpose: "Delivers Facebook SDK/social widgets used for tracking.",
    prevalence: 0.8,
  },
  "twitter.com": {
    owner: "Twitter",
    category: "Social",
    purpose: "Embedded tweets/widgets; can track visits.",
    prevalence: 0.6,
  },
  "t.co": {
    owner: "Twitter",
    category: "Social",
    purpose: "Link shortener; click/redirection tracking.",
    prevalence: 0.55,
  },
  "linkedin.com": {
    owner: "LinkedIn",
    category: "Social",
    purpose: "Social widgets and conversion tracking.",
    prevalence: 0.4,
  },
  "snapchat.com": {
    owner: "Snap",
    category: "Social",
    purpose: "Pixel and analytics for ad attribution.",
    prevalence: 0.2,
  },
  "tiktok.com": {
    owner: "ByteDance",
    category: "Social",
    purpose: "Pixel and analytics for ad attribution.",
    prevalence: 0.25,
  },
  "pinterest.com": {
    owner: "Pinterest",
    category: "Social",
    purpose: "Conversion tracking and analytics.",
    prevalence: 0.2,
  },
  "hotjar.com": {
    owner: "Hotjar",
    category: "Behavior",
    purpose: "Session replay and heatmaps of user behavior.",
    prevalence: 0.35,
  },
  "fullstory.com": {
    owner: "FullStory",
    category: "Behavior",
    purpose: "Session replay capturing clicks, scrolls, and text input.",
    prevalence: 0.25,
  },
  "mouseflow.com": {
    owner: "Mouseflow",
    category: "Behavior",
    purpose: "Mouse movement and session recording for analytics.",
    prevalence: 0.2,
  },
  "mixpanel.com": {
    owner: "Mixpanel",
    category: "Analytics",
    purpose: "Product analytics and event tracking.",
    prevalence: 0.4,
  },
  "segment.com": {
    owner: "Twilio Segment",
    category: "Analytics",
    purpose: "Data routing platform that forwards user events.",
    prevalence: 0.35,
  },
  "intercom.io": {
    owner: "Intercom",
    category: "Analytics",
    purpose: "User analytics and in-app chat tracking.",
    prevalence: 0.2,
  },
  "criteo.com": {
    owner: "Criteo",
    category: "Ads",
    purpose: "Retargeting and behavioral advertising.",
    prevalence: 0.35,
  },
  "adnxs.com": {
    owner: "Xandr",
    category: "Ads",
    purpose: "Programmatic advertising and profiling.",
    prevalence: 0.35,
  },
  "taboola.com": {
    owner: "Taboola",
    category: "Ads",
    purpose: "Content recommendation ads and click tracking.",
    prevalence: 0.3,
  },
  "outbrain.com": {
    owner: "Outbrain",
    category: "Ads",
    purpose: "Content recommendation ads and click tracking.",
    prevalence: 0.3,
  },
  "cloudflare.com": {
    owner: "Cloudflare",
    category: "CDN",
    purpose: "CDN/anti-DDoS; generally infrastructure-only.",
    prevalence: 0.9,
  },
  "akamaihd.net": {
    owner: "Akamai",
    category: "CDN",
    purpose: "CDN hosting; typically low risk on its own.",
    prevalence: 0.8,
  },
  "fingerprint.com": {
    owner: "Fingerprint",
    category: "Fingerprinting",
    purpose: "Device fingerprinting to identify users across sessions.",
    prevalence: 0.15,
  },
  "fingerprintjs.com": {
    owner: "Fingerprint",
    category: "Fingerprinting",
    purpose: "Device fingerprinting to identify users across sessions.",
    prevalence: 0.15,
  },
};

// Map tracker-radar entity categories to our coarse buckets.
const CATEGORY_MAP = {
  "Advertising": "Ads",
  "Analytics": "Analytics",
  "Social Network": "Social",
  "CDN": "CDN",
  "Content": "CDN",
  "Unknown": "Analytics",
  "Other": "Analytics",
};

function normalizeCategory(rawCategories = []) {
  // Use first mapped category, default Analytics.
  for (const c of rawCategories) {
    if (CATEGORY_MAP[c]) return CATEGORY_MAP[c];
  }
  return "Analytics";
}

function normalizePurpose(category) {
  switch (category) {
    case "Ads":
      return "Serves ads or measures ad clicks and conversions.";
    case "Analytics":
      return "Measures visits and usage patterns.";
    case "Social":
      return "Social widgets or login that can track visits.";
    case "Fingerprinting":
      return "Identifies devices or browsers to track users.";
    case "CDN":
      return "Delivers assets; typically infrastructure-only.";
    default:
      return "Third-party script.";
  }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "PrivacyLens" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function downloadMaps() {
  try {
    console.log("Downloading tracker-radar domain/entity maps…");
    const [domainMap, entityMap] = await Promise.all([
      fetchJson(DOMAIN_MAP_URL),
      fetchJson(ENTITY_MAP_URL),
    ]);
    return { domainMap, entityMap };
  } catch (err) {
    console.warn("Download failed, falling back to built-in seed list:", err?.message || err);
    return null;
  }
}

function buildMapFromRadar(domainMap, entityMap) {
  if (!domainMap || !entityMap) return {};
  const map = {};

  for (const [domain, info] of Object.entries(domainMap)) {
    const entityName = info?.entityName || "Unknown";
    const entity = entityMap[entityName];
    const rawCategories = entity?.categories || [];
    const category = normalizeCategory(rawCategories);
    const purpose = normalizePurpose(category);
    const prevalence = entity?.prevalence ?? 0.2;

    map[domain] = {
      owner: entityName,
      category,
      purpose,
      prevalence,
    };
  }

  return map;
}

async function main() {
  let map = { ...BASE_MAP };

  const radar = await downloadMaps();
  if (radar?.domainMap && radar?.entityMap) {
    const fromRadar = buildMapFromRadar(radar.domainMap, radar.entityMap);
    if (Object.keys(fromRadar).length > 0) {
      map = fromRadar;
      console.log(`Built map from tracker-radar with ${Object.keys(map).length} domains.`);
    } else {
      console.warn("Parsed 0 domains from tracker-radar; keeping built-in seed map.");
    }
  }

  const header = `// Auto-generated by scripts/updateTrackerData.js
// Source: DuckDuckGo Tracker Radar (domain_map + entity_map)
// Keep this file small; it's bundled into the extension.

export const TRACKER_MAP = `;

  const body = JSON.stringify(map, null, 2);
  fs.writeFileSync(OUTPUT, `${header}${body};\n`);
  console.log(`Wrote ${Object.keys(map).length} tracker domains to ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Failed to update tracker data:", err);
  process.exit(1);
});
