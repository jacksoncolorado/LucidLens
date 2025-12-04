import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BrowserAPIService } from '../../../../services/BrowserAPIService.js';

describe('BrowserAPIService Integration', () => {
    let browserAPIService;

    beforeEach(() => {
        browserAPIService = new BrowserAPIService();
        jest.clearAllMocks();
    });

    describe('getCurrentTab', () => {
        it('should get current active tab', async () => {
            const mockTab = { id: 1, url: 'https://example.com', active: true };
            chrome.tabs.query.mockResolvedValue([mockTab]);

            const result = await browserAPIService.getCurrentTab();

            expect(result).toEqual(mockTab);
            expect(chrome.tabs.query).toHaveBeenCalledWith({
                active: true,
                currentWindow: true
            });
        });

        it('should return null when no tab found', async () => {
            chrome.tabs.query.mockResolvedValue([]);

            const result = await browserAPIService.getCurrentTab();

            expect(result).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            chrome.tabs.query.mockRejectedValue(new Error('Permission denied'));

            const result = await browserAPIService.getCurrentTab();

            expect(result).toBeNull();
        });
    });

    describe('getTabURL', () => {
        it('should get URL for specific tab', async () => {
            const mockTab = { id: 1, url: 'https://example.com' };
            chrome.tabs.get.mockResolvedValue(mockTab);

            const result = await browserAPIService.getTabURL(1);

            expect(result).toBe('https://example.com');
            expect(chrome.tabs.get).toHaveBeenCalledWith(1);
        });

        it('should return null when tab not found', async () => {
            chrome.tabs.get.mockResolvedValue(null);

            const result = await browserAPIService.getTabURL(999);

            expect(result).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            chrome.tabs.get.mockRejectedValue(new Error('Tab not found'));

            const result = await browserAPIService.getTabURL(999);

            expect(result).toBeNull();
        });
    });

    describe('onTabUpdated', () => {
        it('should register callback for tab updates', () => {
            const callback = jest.fn();
            browserAPIService.onTabUpdated(callback);

            expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
        });

        it('should call callback when tab is updated and complete', () => {
            const callback = jest.fn();
            browserAPIService.onTabUpdated(callback);

            const listener = chrome.tabs.onUpdated.addListener.mock.calls[0][0];
            const mockTab = { id: 1, url: 'https://example.com', active: true };
            listener(1, { status: 'complete' }, mockTab);

            expect(callback).toHaveBeenCalledWith(mockTab);
        });

        it('should not call callback when tab is not active', () => {
            const callback = jest.fn();
            browserAPIService.onTabUpdated(callback);

            const listener = chrome.tabs.onUpdated.addListener.mock.calls[0][0];
            const mockTab = { id: 1, url: 'https://example.com', active: false };
            listener(1, { status: 'complete' }, mockTab);

            expect(callback).not.toHaveBeenCalled();
        });

        it('should not call callback when status is not complete', () => {
            const callback = jest.fn();
            browserAPIService.onTabUpdated(callback);

            const listener = chrome.tabs.onUpdated.addListener.mock.calls[0][0];
            const mockTab = { id: 1, url: 'https://example.com', active: true };
            listener(1, { status: 'loading' }, mockTab);

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('onTabActivated', () => {
        it('should register callback for tab activation', () => {
            const callback = jest.fn();
            browserAPIService.onTabActivated(callback);

            expect(chrome.tabs.onActivated.addListener).toHaveBeenCalled();
        });

        it('should call callback with tab when activated', async () => {
            const callback = jest.fn();
            browserAPIService.onTabActivated(callback);

            const listener = chrome.tabs.onActivated.addListener.mock.calls[0][0];
            const mockTab = { id: 1, url: 'https://example.com' };
            chrome.tabs.get.mockResolvedValue(mockTab);

            await listener({ tabId: 1 });

            expect(chrome.tabs.get).toHaveBeenCalledWith(1);
            expect(callback).toHaveBeenCalledWith(mockTab);
        });

        it('should not call callback when tab has no URL', async () => {
            const callback = jest.fn();
            browserAPIService.onTabActivated(callback);

            const listener = chrome.tabs.onActivated.addListener.mock.calls[0][0];
            const mockTab = { id: 1, url: null };
            chrome.tabs.get.mockResolvedValue(mockTab);

            await listener({ tabId: 1 });

            expect(callback).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            const callback = jest.fn();
            browserAPIService.onTabActivated(callback);

            const listener = chrome.tabs.onActivated.addListener.mock.calls[0][0];
            chrome.tabs.get.mockRejectedValue(new Error('Tab not found'));

            await listener({ tabId: 999 });

            expect(callback).not.toHaveBeenCalled();
        });
    });
});

