import { WebsiteController } from './WebsiteController';
import { BrowserAPIService } from '../services/BrowserAPIService.js'

// src/controllers/PopupController.js
export class PopupController {
  async initialize() {
    // Tell background we’re ready
    chrome.runtime.sendMessage({ type: "popup:ready" });

    // Wait for one update message and resolve it
    return new Promise((resolve) => {
      const handler = (msg) => {
        if (msg?.type === "site:update") {
          chrome.runtime.onMessage.removeListener(handler);
          resolve({
            displayUrl: msg.payload.host || "(unknown)",
            fullUrl: msg.payload.url || "",
            canAnalyze: true,
            isSecure: true, // placeholder
            message: "Privacy: TBD",
          });
        }
      };
      chrome.runtime.onMessage.addListener(handler);
    });
  }

  async refreshWebsiteInfo() {
    return await this.initialize();
  }
}
