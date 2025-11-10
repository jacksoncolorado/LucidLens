// import { createFetchableDevEnvironment } from "vite";

// src/services/BrowserAPIService.js
export class BrowserAPIService {
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab ?? null;
    } catch (error) {
      console.error('getCurrentTab error:', error);
      return null;
    }
  }

  async getTabURL(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      return tab?.url ?? null;
    } catch (error) {
      console.error('getTabURL error:', error);
      return null;
    }
  }

  onTabUpdated(callback) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Fire only when navigation finished, tab is active, and has a URL
      if (changeInfo.status === 'complete' && tab?.active && tab?.url) {
        callback(tab);
      }
    });
  }

  onTabActivated(callback) {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab?.url) callback(tab);
      } catch (error) {
        console.error('onTabActivated error:', error);
      }
    });
  }
}
