# Privacy Lens

Privacy Lens is a browser extension that analyzes websites for privacy-impacting behaviors, including tracking scripts, cookies, third-party requests, and privacy policy transparency. It generates a privacy score and an optional AI-powered summary to help users understand website risks.

============================================================
FEATURES
============================================================

REAL-TIME WEBSITE ANALYSIS
- Detects cookies (first-party and third-party)
- Detects tracking cookies
- Detects tracking scripts (analytics, fingerprinting, advertising, behavioral tracking)
- Detects third-party network requests
- Detects localStorage and sessionStorage usage
- Detects privacy policy links automatically

AI-POWERED PRIVACY SUMMARY
Generates a six-section readable explanation:
1. Summary
2. Data Collection Practices
3. Privacy Policy Highlights
4. Score Explanation
5. Risk Breakdown
6. Recommendations

Scores are contextualized by the site's category (news, social media, e-commerce, streaming, etc.).

PRIVACY SCORE (0–100)
Score penalties:
- Tracking scripts: 0–25 points
- Tracking requests: 0–20 points
- Tracking cookies: 0–20 points
- Missing privacy policy: 10 points

Score tiers:
- 85–100: Excellent
- 70–84: Good
- 55–69: Fair
- 40–54: Poor
- 0–39: Very Poor

SCRIPT BREAKDOWN
Each detected script includes:
- URL
- First or third-party
- Category (analytics, fingerprinting, etc.)
- Risk level
- Description

PRIVACY DATA SUMMARY UI
Shows:
- URL and security state
- Privacy score and rating
- Data summary (cookies, scripts, requests)
- Script details
- Privacy policy information
- Optional AI summary

============================================================
ARCHITECTURE OVERVIEW
============================================================

Directory structure:
src/
  background/          (service worker and main logic)
  contentScripts/      (script detection + policy scraping)
  controllers/         (popup and background controllers)
  models/              (PrivacyData, PrivacyScore, Website)
  services/            (storage, browser API, web requests, AI)
  views/               (Svelte UI components)
  popup/               (popup entry file)
  utils/               (optional helpers)

BACKGROUND SERVICE WORKER
- Tracks URL changes and SPA navigation
- Monitors all network requests
- Categorizes requests as tracking or third-party
- Receives script details from content scripts
- Collects cookie information from response headers
- Gathers and stores privacy policy content
- Calculates privacy score
- Sends updates to popup

CONTENT SCRIPTS
privacyScanner.js:
- Classifies scripts by behavior
- Detects privacy policy links
- Observes DOM changes and rescans on updates

policyScraper.js:
- Extracts visible text, JSON-LD, inline script content
- Sends raw privacy policy text to background for storage

POPUP (SVELTE COMPONENTS)
- Displays URL, score, factors, recommendations
- Displays data summary and script detail lists
- Freezes script list to avoid UI flicker
- Generates AI summary on demand

AI SERVICE
- Sends structured request to xAI API
- Receives structured privacy summary text
- Cleans output formatting
- Uses site category to contextualize findings

============================================================
INSTALLATION AND DEVELOPMENT
============================================================

Requirements:
- Node.js 18 or higher
- Chromium-based browser

Install dependencies:
npm install

Build the extension:
npm run build

Load into Chrome:
1. Go to chrome://extensions
2. Enable Developer Mode
3. Select "Load unpacked"
4. Choose the "dist" folder

Popup development preview:
vite

============================================================
REQUIRED PERMISSIONS
============================================================

tabs:
  Detect active tab and URL changes

webRequest:
  Monitor network requests made by webpages

cookies:
  Detect cookies set by websites

storage:
  Save scraped policy text and cached data

scripting:
  Inject content scripts into webpages

host_permissions:
  <all_urls>  
  Required to analyze any website

============================================================
SCORING MODEL SUMMARY
============================================================

Tracking scripts: penalty 0–25  
Tracking requests: penalty 0–20  
Tracking cookies: penalty 0–20  
Missing privacy policy: penalty 10  

Final score = 100 - total penalties (minimum 0).

Score tiers:
Excellent: 85–100  
Good: 70–84  
Fair: 55–69  
Poor: 40–54  
Very Poor: 0–39

============================================================
ROADMAP / FUTURE ENHANCEMENTS
============================================================

Near-term improvements:
- User-defined risk tolerance
- Blocks or warnings on high-risk scripts
- Privacy policy version change detection
- Exportable privacy reports
- Optional light/dark theme

Long-term enhancements:
- Fully local privacy policy summarization
- ML-based tracker classification
- Firefox and Safari support

============================================================
AUTHORS
============================================================

Jackson McGuire  
Lead developer: MV3 architecture, background worker, scoring engine, AI summary flow, script classifier integration.

Ben Lambert  
Frontend developer: Svelte components, UI structure, early project scaffolding.

============================================================
ACADEMIC CITATION
============================================================

Privacy Lens — Browser Extension for Website Privacy Transparency  
University of Colorado Colorado Springs  
CS 4930: Privacy & Censorship (2025)

============================================================
LICENSE
============================================================

MIT License
