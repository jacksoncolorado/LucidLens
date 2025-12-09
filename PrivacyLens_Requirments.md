# Privacy Lens – Web Extension Requirements Document

============================================================
PROJECT OVERVIEW
============================================================

Project Name: Privacy Lens
Technology Stack: Svelte + Vite + Manifest V3 + JavaScript
Target Platform: Chromium-based browsers (Chrome, Edge, Brave)
Project Type: Browser Extension for Privacy Data Transparency

============================================================
PROJECT DESCRIPTION
============================================================

Privacy Lens is a browser extension that analyzes how websites collect data. 
It detects tracking scripts, cookies, third-party network requests, storage usage,
and privacy policy availability, then presents results in a clear, user-friendly UI.
The extension also provides an optional AI-generated privacy summary.

The goal is to help users understand how a website behaves behind the scenes and
to increase privacy transparency across the web.

============================================================
ARCHITECTURE OVERVIEW
============================================================

Technology Stack:
- Frontend: Svelte (UI components)
- Build Tool: Vite
- Architecture: Modular MVC-inspired structure
- Browser Runtime: Manifest V3 Service Worker
- Styling: Component-scoped Svelte CSS
- AI Integration: External API (xAI)

File Structure:
src/
  models/        (PrivacyData, PrivacyScore, Website)
  views/         (Svelte UI components)
  controllers/   (PopupController, PrivacyDataController)
  services/      (storage, browser API, webRequest, AI service)
  background/    (background.js: main service worker)
  contentScripts/ (tracking scanner + policy scraper)
  popup/         (popup entry + main Svelte view)
  utils/         (optional small helpers)

============================================================
CORE REQUIREMENTS
============================================================

------------------------------------------------------------
1. Website Detection
------------------------------------------------------------
Priority: Must Have

Description:
The extension must automatically identify the website the user is visiting in real time.

Acceptance Criteria:
- Detect URL changes immediately
- Work across HTTP and HTTPS
- Handle SPAs (single-page applications)
- Maintain correct state when switching tabs

Technical Requirements:
- Use chrome.tabs.onUpdated
- Use chrome.tabs.onActivated
- Ensure URL validation
- Ignore special pages (chrome://, extension pages)

------------------------------------------------------------
2. Display Current Web Address
------------------------------------------------------------
Priority: Must Have

Description:
Show the full current URL in the popup with security indicator (HTTP/HTTPS).

Acceptance Criteria:
- Display full URL with truncation when appropriate
- Update automatically when user navigates
- Show hostname and security status (lock icon)

Technical Requirements:
- Retrieve active tab via chrome.tabs.query
- Implement URL shortening logic
- Handle invalid or unsupported URLs

------------------------------------------------------------
3. Gather and Display Privacy Data
------------------------------------------------------------
Priority: Must Have

Description:
Collect privacy-impacting activity and display it in categories.

Acceptance Criteria:
- Detect all tracking scripts on page
- Detect network requests and classify them
- Detect cookies set via response headers
- Detect localStorage/sessionStorage usage
- Provide categorized summaries and details

Technical Requirements:
- Use chrome.webRequest for network analysis
- Use contentScripts/privacyScanner.js for script detection
- Detect cookies via headersReceived listener
- Classify scripts by category and risk level
- Categorize requests as first-party, third-party, tracking, data brokers

Data Categories:
- Cookies (first/third-party, tracking, session)
- LocalStorage/sessionStorage keys
- Tracking scripts (analytics, fingerprinting, advertising, behavior tracking)
- Third-party requests
- Tracking-related requests
- Data brokers and high-risk endpoints

------------------------------------------------------------
4. Gather and Analyze Privacy Policy Information
------------------------------------------------------------
Priority: Must Have

Description:
Locate, retrieve, and store privacy policy content to assist with transparency.

Acceptance Criteria:
- Automatically detect privacy policy links on the page
- Scrape full privacy policy text when loaded
- Cache extracted policy text locally
- Handle scenarios where no policy is found

Technical Requirements:
- Use contentScripts/privacyScanner.js to detect links
- Inject policyScraper.js into detected policy pages
- Extract visible text, JSON-LD, and script metadata
- Store results using chrome.storage.local
- Account for modern frameworks (Next.js, React, etc.)

------------------------------------------------------------
5. Provide a Privacy Score and Summary
------------------------------------------------------------
Priority: Must Have

Description:
Generate a numeric score and explanatory breakdown of website privacy posture.

Acceptance Criteria:
- Score updates automatically based on data collected
- Provide detailed breakdown of penalties
- Show recommendations based on tracking activity
- Include AI-generated summary when requested

Technical Requirements:
- Implement scoring in PrivacyScore model
- Score factors:
    - Tracking scripts
    - Tracking requests
    - Tracking cookies
    - Whether a privacy policy is available
- Create rating categories:
    Excellent, Good, Fair, Poor, Very Poor
- Generate recommendations
- Freeze data during AI summary generation to avoid UI flicker

============================================================
USER INTERFACE REQUIREMENTS
============================================================

Design Principles:
- Simplicity: Clear, minimal UI
- Accessibility: Understandable to non-technical users
- Consistency: Structured Svelte components
- Performance: Fast rendering and updates
- Responsiveness: Handles varied content sizes gracefully

Main Popup Interface:
- Header with extension name
- URL display with HTTPS indicator
- Privacy score circle + bar
- Score breakdown component
- Data collection summary (cookies, scripts, requests)
- Recommendations section
- Privacy policy link (if found)
- AI summary section
- Refresh and AI buttons

Detailed Script View (TrackingScriptDetails):
- Each script shows:
  URL, category, risk, first vs third party, description.

============================================================
TECHNICAL SPECIFICATIONS
============================================================

Browser APIs:
- chrome.tabs (URL detection)
- chrome.webRequest (network request analysis)
- chrome.storage (local data persistence)
- chrome.runtime (messaging between scripts)
- chrome.scripting (inject content scripts)
- chrome.cookies (identify set-cookie headers)

Performance Requirements:
- Popup load time < 500ms
- Minimal CPU use for background monitoring
- Efficient data caching
- Avoid duplicate scanning

Security Requirements:
- No user-identifying data stored
- No external transmission of browsing history except:
    - Optional AI summary mode (policy + tracking classification only)
- CSP-compliant extension pages
- API key must not be bundled in production builds

============================================================
TESTING REQUIREMENTS
============================================================

Testing Types:
- Manual testing across multiple websites
- Functional testing of scoring logic
- Validation of script classification
- Validation of privacy policy scraping
- UI state testing (expanded/collapsed, load states)

Acceptance Guidelines:
- Extension must correctly detect policies, scripts, cookies, and requests
- Score must match expected values based on defined rules
- Popup must reflect changes in real time

============================================================
BACKLOG FEATURES (FUTURE WORK)
============================================================

- User-defined risk tolerance settings
- Blocking or warnings for high-risk trackers
- Policy change detection (version comparison)
- Exportable privacy reports
- Light and dark theme modes
- Fully local privacy policy summarization (no external API)
- Machine-learning powered tracker classification
- Ports for Firefox and Safari

============================================================
DEVELOPMENT PHASES
============================================================

Phase 1 – Foundation
- Svelte + Vite setup
- Manifest V3 configuration
- Basic popup UI
- Website detection

Phase 2 – Data Collection System
- WebRequest monitoring
- Tracking script classifier
- Cookie and storage detection
- Script risk engine

Phase 3 – Scoring and Visualization
- PrivacyScore engine
- Score breakdown UI
- Recommendations

Phase 4 – Policy Integration
- Policy detection
- Policy scraping
- Caching + text normalization

Phase 5 – AI Integration
- External API request handler
- Summary generation UI
- Output cleanup and formatting

Phase 6 – Optimization and Stabilization
- Performance tuning
- UI polish
- Error handling improvements

============================================================
SUCCESS CRITERIA
============================================================

Functional Success:
- Website is fully analyzed within 1–2 seconds
- Privacy score accurately reflects collected data
- Policy scraping works on most major sites
- AI summary produces readable output

Performance Success:
- Minimal performance impact on browsing
- Popup remains responsive
- Background script stable under heavy browsing

User Experience Success:
- Clear and helpful presentation of privacy data
- Recommendations understandable to non-experts
- No unnecessary friction or confusion

============================================================
CONCLUSION
============================================================

Privacy Lens provides users with a transparent view of website tracking and privacy practices. 
Its combination of real-time analysis, structured scoring, and AI-assisted summaries makes privacy more understandable for everyday users.

The modular architecture supports future enhancements such as blocking capabilities, local ML, customizable risk profiles, and cross-browser support.
