import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import WebsiteController from '../../../../controllers/WebsiteController.js';
import * as DetectURL from '../../../../services/DetectURL.js';

// Mock DetectURL service
jest.mock('../../../../services/DetectURL.js', () => ({
    detectURL: jest.fn(),
    simplifyDomain: jest.fn()
}));

describe('WebsiteController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('processWebsite', () => {
        it('should process website successfully', async () => {
            DetectURL.detectURL.mockResolvedValue({
                url: 'https://example.com',
                domainDisplay: 'example.com',
                tabId: 1
            });

            const result = await WebsiteController.processWebsite();

            expect(result.fullUrl).toBe('https://example.com');
            expect(result.host).toBe('example.com');
            expect(result.isSecure).toBe(true);
        });

        it('should identify secure URLs', async () => {
            DetectURL.detectURL.mockResolvedValue({
                url: 'https://secure.example.com',
                domainDisplay: 'secure.example.com',
                tabId: 1
            });

            const result = await WebsiteController.processWebsite();

            expect(result.isSecure).toBe(true);
        });

        it('should identify insecure URLs', async () => {
            DetectURL.detectURL.mockResolvedValue({
                url: 'http://insecure.example.com',
                domainDisplay: 'insecure.example.com',
                tabId: 1
            });

            const result = await WebsiteController.processWebsite();

            expect(result.isSecure).toBe(false);
        });

        it('should handle errors gracefully', async () => {
            DetectURL.detectURL.mockRejectedValue(new Error('Network error'));

            const result = await WebsiteController.processWebsite();

            expect(result.fullUrl).toBeNull();
            expect(result.host).toBeNull();
            expect(result.isSecure).toBe(false);
        });

        it('should handle null URL', async () => {
            DetectURL.detectURL.mockResolvedValue({
                url: null,
                domainDisplay: null,
                tabId: null
            });

            const result = await WebsiteController.processWebsite();

            expect(result.fullUrl).toBeNull();
            expect(result.isSecure).toBe(false);
        });
    });
});

