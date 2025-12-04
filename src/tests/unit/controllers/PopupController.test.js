import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PopupController from '../../../../controllers/PopupController.js';

describe('PopupController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        chrome.runtime.sendMessage.mockClear();
    });

    describe('loadWebsiteInfo', () => {
        it('should load website info successfully', async () => {
            const mockResponse = {
                fullUrl: 'https://example.com',
                host: 'example.com',
                isSecure: true,
                privacyScore: 85,
                privacyData: {
                    summary: { totalCookies: 5 }
                },
                privacyScoreDetails: {
                    score: 85,
                    rating: 'Excellent'
                },
                message: 'Privacy check complete.'
            };

            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback(mockResponse);
            });

            const result = await PopupController.loadWebsiteInfo();

            expect(result.fullUrl).toBe('https://example.com');
            expect(result.host).toBe('example.com');
            expect(result.isSecure).toBe(true);
            expect(result.privacyScore).toBe(85);
            expect(result.privacyData).toBeDefined();
            expect(result.privacyScoreDetails).toBeDefined();
        });

        it('should handle chrome.runtime.lastError', async () => {
            chrome.runtime.lastError = { message: 'Port closed' };
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback({});
            });

            const result = await PopupController.loadWebsiteInfo();

            expect(result.fullUrl).toBeNull();
            expect(result.host).toBeNull();
            expect(result.isSecure).toBe(false);
            expect(result.message).toBe('No response from background');
        });

        it('should handle null response', async () => {
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback(null);
            });

            const result = await PopupController.loadWebsiteInfo();

            expect(result.fullUrl).toBeNull();
            expect(result.host).toBeNull();
            expect(result.isSecure).toBe(false);
            expect(result.message).toBe('No response from background');
        });

        it('should handle missing message in response', async () => {
            const mockResponse = {
                fullUrl: 'https://example.com',
                host: 'example.com',
                isSecure: true,
                privacyScore: 85
            };

            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback(mockResponse);
            });

            const result = await PopupController.loadWebsiteInfo();

            expect(result.fullUrl).toBe('https://example.com');
            expect(result.message).toBe('Privacy check complete.');
        });

        it('should send correct message type', async () => {
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                expect(message.type).toBe('popup:ready');
                callback({});
            });

            await PopupController.loadWebsiteInfo();

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                { type: 'popup:ready' },
                expect.any(Function)
            );
        });
    });
});

