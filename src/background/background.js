import { BrowserAPIService } from '../services/BrowserAPIService.js';
import { WebsiteController } from '../controllers/WebsiteController.js';

class BackgroundService {
    constructor() {
        this.browserService = new BrowserAPIService();
        this.websiteController = new WebsiteController();
        this.init();
    }

    init() {
        console.log('Privacy Lens Background Service Initialized');

        // 1) Tab lifecycle → update popup when URL is ready
        this.browserService.onTabUpdated((tab) => { this.handleTabChange(tab); });
        this.browserService.onTabActivated((tab) => { this.handleTabChange(tab); });

        // 2) Popup handshake → push current site immediately
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg?.type === 'popup:ready') {
            this.sendCurrentSite();
      }
      // no async sendResponse here, so no return true
    });
    }

// Ask BrowserAPIService for the active tab and forward to handleTabChange
  async sendCurrentSiteOnce() {
    const tab = await this.browserService.getCurrentTab?.();
    if (tab) this.handleTabChange(tab);
  }

  async handleTabChange(tab) {
    if (!tab?.url) return;                      // no URL, nothing to show
    if (/^(chrome|edge|about):/.test(tab.url)) return; // skip internal pages

    // Use your existing controller (keeps logic in one place)
    const site = await this.websiteController.detectWebsite(tab.url);
    if (!this.websiteController.canAnalyzeWebsite(site)) return;

    const host = site.hostname || new URL(tab.url).hostname;

    // 🔑 Send the one message the popup needs
    chrome.runtime.sendMessage({
      type: 'site:update',
      payload: { host, url: tab.url, score: 'TBD' }
    });
  }
}

const backgroundService = new BackgroundService();