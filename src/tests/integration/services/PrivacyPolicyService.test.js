import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrivacyPolicyService } from '../../../../services/PrivacyPolicyService.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('PrivacyPolicyService Integration', () => {
    let privacyPolicyService;

    beforeEach(() => {
        privacyPolicyService = new PrivacyPolicyService();
        jest.clearAllMocks();
        fetch.mockClear();
    });

    describe('constructor', () => {
        it('should initialize with policy keywords', () => {
            expect(privacyPolicyService.policyKeywords.length).toBeGreaterThan(0);
            expect(privacyPolicyService.policyKeywords).toContain('privacy');
            expect(privacyPolicyService.policyKeywords).toContain('privacy policy');
        });
    });

    describe('detectPrivacyPolicy', () => {
        it('should return null for background service (no page access)', async () => {
            const result = await privacyPolicyService.detectPrivacyPolicy('https://example.com');

            expect(result).toBeNull();
        });

        it('should handle null URL', async () => {
            const result = await privacyPolicyService.detectPrivacyPolicy(null);

            expect(result).toBeNull();
        });
    });

    describe('checkUrlExists', () => {
        it('should check if URL exists', async () => {
            fetch.mockResolvedValue({ ok: true });

            const result = await privacyPolicyService.checkUrlExists('https://example.com/privacy');

            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledWith('https://example.com/privacy', {
                method: 'HEAD',
                mode: 'no-cors'
            });
        });

        it('should handle fetch errors', async () => {
            fetch.mockRejectedValue(new Error('Network error'));

            const result = await privacyPolicyService.checkUrlExists('https://example.com/privacy');

            expect(result).toBe(false);
        });
    });

    describe('extractPolicySummary', () => {
        it('should return placeholder summary', async () => {
            const result = await privacyPolicyService.extractPolicySummary('https://example.com/privacy');

            expect(result.found).toBe(true);
            expect(result.url).toBe('https://example.com/privacy');
            expect(result.summary).toBeDefined();
        });
    });

    describe('findPrivacyPolicyLinks', () => {
        it('should find privacy policy links in HTML', () => {
            const htmlContent = `
                <html>
                    <body>
                        <a href="/privacy">Privacy Policy</a>
                        <a href="/terms">Terms of Service</a>
                        <a href="/privacy-policy">Our Privacy Policy</a>
                        <a href="/about">About Us</a>
                    </body>
                </html>
            `;

            const links = privacyPolicyService.findPrivacyPolicyLinks(htmlContent);

            expect(links.length).toBeGreaterThan(0);
            expect(links.some(link => link.url === '/privacy')).toBe(true);
            expect(links.some(link => link.url === '/privacy-policy')).toBe(true);
        });

        it('should not find non-privacy links', () => {
            const htmlContent = `
                <html>
                    <body>
                        <a href="/about">About Us</a>
                        <a href="/contact">Contact</a>
                    </body>
                </html>
            `;

            const links = privacyPolicyService.findPrivacyPolicyLinks(htmlContent);

            expect(links.length).toBe(0);
        });

        it('should handle empty HTML', () => {
            const links = privacyPolicyService.findPrivacyPolicyLinks('');

            expect(links.length).toBe(0);
        });

        it('should match case-insensitive keywords', () => {
            const htmlContent = `
                <a href="/privacy">PRIVACY POLICY</a>
                <a href="/data-protection">Data Protection</a>
            `;

            const links = privacyPolicyService.findPrivacyPolicyLinks(htmlContent);

            expect(links.length).toBeGreaterThan(0);
        });
    });

    describe('policy keywords matching', () => {
        it('should match various privacy-related terms', () => {
            const testCases = [
                { text: 'Privacy Policy', shouldMatch: true },
                { text: 'Privacy Statement', shouldMatch: true },
                { text: 'Privacy Notice', shouldMatch: true },
                { text: 'Data Protection', shouldMatch: true },
                { text: 'Data Privacy', shouldMatch: true },
                { text: 'About Us', shouldMatch: false },
                { text: 'Contact', shouldMatch: false }
            ];

            testCases.forEach(({ text, shouldMatch }) => {
                const htmlContent = `<a href="/link">${text}</a>`;
                const links = privacyPolicyService.findPrivacyPolicyLinks(htmlContent);

                if (shouldMatch) {
                    expect(links.length).toBeGreaterThan(0);
                } else {
                    expect(links.length).toBe(0);
                }
            });
        });
    });
});

