import { describe, it, expect } from '@jest/globals';
import { Website } from '../../../../models/Website.js';

describe('Website', () => {
    describe('constructor', () => {
        it('should initialize with provided values', () => {
            const website = new Website(
                'https://example.com',
                'example.com',
                'https:',
                true
            );

            expect(website.url).toBe('https://example.com');
            expect(website.hostname).toBe('example.com');
            expect(website.protocol).toBe('https:');
            expect(website.isSecure).toBe(true);
            expect(website.timestamp).toBeDefined();
        });
    });

    describe('isValid', () => {
        it('should return true for valid website', () => {
            const website = new Website(
                'https://example.com',
                'example.com',
                'https:',
                true
            );

            expect(website.isValid()).toBe(true);
        });

        it('should return false when url is missing', () => {
            const website = new Website(null, 'example.com', 'https:', true);
            expect(website.isValid()).toBe(false);
        });

        it('should return false when hostname is missing', () => {
            const website = new Website('https://example.com', null, 'https:', true);
            expect(website.isValid()).toBe(false);
        });

        it('should return false when protocol is missing', () => {
            const website = new Website('https://example.com', 'example.com', null, true);
            expect(website.isValid()).toBe(false);
        });
    });

    describe('isSpecialPage', () => {
        it('should return true for chrome:// URLs', () => {
            const website = new Website('chrome://settings', 'settings', 'chrome:', false);
            expect(website.isSpecialPage()).toBe(true);
        });

        it('should return true for about: URLs', () => {
            const website = new Website('about:blank', 'blank', 'about:', false);
            expect(website.isSpecialPage()).toBe(true);
        });

        it('should return true for chrome-extension:// URLs', () => {
            const website = new Website(
                'chrome-extension://abc123',
                'abc123',
                'chrome-extension:',
                false
            );
            expect(website.isSpecialPage()).toBe(true);
        });

        it('should return true for file:// URLs', () => {
            const website = new Website('file:///path/to/file', 'file', 'file:', false);
            expect(website.isSpecialPage()).toBe(true);
        });

        it('should return false for regular http URLs', () => {
            const website = new Website('http://example.com', 'example.com', 'http:', false);
            expect(website.isSpecialPage()).toBe(false);
        });

        it('should return false for regular https URLs', () => {
            const website = new Website('https://example.com', 'example.com', 'https:', true);
            expect(website.isSpecialPage()).toBe(false);
        });
    });

    describe('getDisplayUrl', () => {
        it('should return full URL when length <= 60', () => {
            const website = new Website(
                'https://example.com',
                'example.com',
                'https:',
                true
            );

            expect(website.getDisplayUrl()).toBe('https://example.com');
        });

        it('should truncate URL when length > 60', () => {
            const longUrl = 'https://example.com/very/long/path/that/exceeds/sixty/characters/limit';
            const website = new Website(longUrl, 'example.com', 'https:', true);

            const displayUrl = website.getDisplayUrl();
            expect(displayUrl.length).toBe(60);
            expect(displayUrl).toEndWith('...');
        });

        it('should handle exactly 60 character URLs', () => {
            const url = 'https://example.com/path/that/is/exactly/sixty/characters/long';
            const website = new Website(url, 'example.com', 'https:', true);

            expect(website.getDisplayUrl().length).toBeLessThanOrEqual(60);
        });
    });
});

