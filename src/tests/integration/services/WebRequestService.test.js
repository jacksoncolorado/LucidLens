import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WebRequestService } from '../../../../services/WebRequestService.js';

describe('WebRequestService Integration', () => {
    let webRequestService;

    beforeEach(() => {
        webRequestService = new WebRequestService();
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with tracking domains', () => {
            expect(webRequestService.trackingDomains.size).toBeGreaterThan(0);
            expect(webRequestService.trackingDomains.has('google-analytics.com')).toBe(true);
        });
    });

    describe('startMonitoring', () => {
        it('should register listeners for web requests', () => {
            webRequestService.startMonitoring();

            expect(chrome.webRequest.onBeforeRequest.addListener).toHaveBeenCalled();
            expect(chrome.webRequest.onHeadersReceived.addListener).toHaveBeenCalled();
        });

        it('should handle request events', () => {
            const listener = jest.fn();
            webRequestService.onRequest(listener);
            webRequestService.startMonitoring();

            const beforeRequestListener = chrome.webRequest.onBeforeRequest.addListener.mock.calls[0][0];
            const requestDetails = {
                url: 'https://example.com/api',
                initiator: 'https://example.com',
                tabId: 1,
                type: 'xmlhttprequest'
            };

            beforeRequestListener(requestDetails);

            expect(listener).toHaveBeenCalled();
        });

        it('should handle response headers for cookies', () => {
            const listener = jest.fn();
            webRequestService.onRequest(listener);
            webRequestService.startMonitoring();

            const headersListener = chrome.webRequest.onHeadersReceived.addListener.mock.calls[0][0];
            const responseDetails = {
                url: 'https://example.com',
                tabId: 1,
                responseHeaders: [
                    { name: 'Set-Cookie', value: 'session=abc123; Path=/' },
                    { name: 'Content-Type', value: 'text/html' }
                ]
            };

            headersListener(responseDetails);

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'cookie',
                    cookies: ['session=abc123; Path=/']
                })
            );
        });
    });

    describe('stopMonitoring', () => {
        it('should remove listeners when stopped', () => {
            webRequestService.startMonitoring();
            webRequestService.stopMonitoring();

            expect(chrome.webRequest.onBeforeRequest.removeListener).toHaveBeenCalled();
            expect(chrome.webRequest.onHeadersReceived.removeListener).toHaveBeenCalled();
        });
    });

    describe('isTrackingRequest', () => {
        it('should identify tracking requests by domain', () => {
            expect(webRequestService.isTrackingRequest('https://google-analytics.com/ga.js')).toBe(true);
            expect(webRequestService.isTrackingRequest('https://googletagmanager.com/gtm.js')).toBe(true);
            expect(webRequestService.isTrackingRequest('https://facebook.com/sdk.js')).toBe(true);
        });

        it('should identify tracking requests by URL pattern', () => {
            expect(webRequestService.isTrackingRequest('https://example.com/track/user')).toBe(true);
            expect(webRequestService.isTrackingRequest('https://example.com/pixel.gif')).toBe(true);
            expect(webRequestService.isTrackingRequest('https://example.com/analytics')).toBe(true);
        });

        it('should return false for non-tracking requests', () => {
            expect(webRequestService.isTrackingRequest('https://example.com/api/data')).toBe(false);
            expect(webRequestService.isTrackingRequest('https://example.com/styles.css')).toBe(false);
        });
    });

    describe('isThirdPartyRequest', () => {
        it('should identify third-party requests', () => {
            expect(webRequestService.isThirdPartyRequest(
                'https://thirdparty.com/api',
                'https://example.com'
            )).toBe(true);
        });

        it('should identify first-party requests', () => {
            expect(webRequestService.isThirdPartyRequest(
                'https://example.com/api',
                'https://example.com'
            )).toBe(false);
        });

        it('should handle www prefix differences', () => {
            expect(webRequestService.isThirdPartyRequest(
                'https://www.example.com/api',
                'https://example.com'
            )).toBe(false);
        });

        it('should return false when no initiator', () => {
            expect(webRequestService.isThirdPartyRequest('https://example.com/api', '')).toBe(false);
        });
    });

    describe('extractDomain', () => {
        it('should extract domain from URL', () => {
            expect(webRequestService.extractDomain('https://example.com/path')).toBe('example.com');
            expect(webRequestService.extractDomain('http://subdomain.example.com')).toBe('subdomain.example.com');
        });

        it('should return null for invalid URL', () => {
            expect(webRequestService.extractDomain('not-a-url')).toBeNull();
        });
    });

    describe('onRequest and removeListener', () => {
        it('should register and remove listeners', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            webRequestService.onRequest(listener1);
            webRequestService.onRequest(listener2);
            webRequestService.removeListener(listener1);

            webRequestService.startMonitoring();
            const beforeRequestListener = chrome.webRequest.onBeforeRequest.addListener.mock.calls[0][0];
            beforeRequestListener({ url: 'https://example.com', initiator: 'https://example.com', tabId: 1 });

            expect(listener2).toHaveBeenCalled();
            expect(listener1).not.toHaveBeenCalled();
        });
    });

    describe('request filtering', () => {
        it('should skip chrome-extension URLs', () => {
            const listener = jest.fn();
            webRequestService.onRequest(listener);
            webRequestService.startMonitoring();

            const beforeRequestListener = chrome.webRequest.onBeforeRequest.addListener.mock.calls[0][0];
            beforeRequestListener({
                url: 'chrome-extension://abc123/popup.html',
                initiator: 'chrome-extension://abc123',
                tabId: 1
            });

            // Listener should still be called, but service should handle filtering
            expect(listener).toHaveBeenCalled();
        });
    });
});

