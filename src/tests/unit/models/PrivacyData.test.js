import { describe, it, expect, beforeEach } from '@jest/globals';
import { PrivacyData } from '../../../../models/PrivacyData.js';

describe('PrivacyData', () => {
    let privacyData;

    beforeEach(() => {
        privacyData = new PrivacyData('https://example.com');
    });

    describe('constructor', () => {
        it('should initialize with correct structure', () => {
            expect(privacyData.url).toBe('https://example.com');
            expect(privacyData.hostname).toBe('example.com');
            expect(privacyData.timestamp).toBeDefined();
            expect(privacyData.cookies).toEqual({
                firstParty: [],
                thirdParty: [],
                tracking: [],
                session: []
            });
            expect(privacyData.storage).toEqual({
                localStorage: [],
                sessionStorage: []
            });
            expect(privacyData.tracking).toEqual({
                scripts: [],
                pixels: [],
                analytics: [],
                socialMedia: [],
                advertising: []
            });
            expect(privacyData.networkRequests).toEqual({
                thirdParty: [],
                tracking: [],
                dataBrokers: []
            });
        });

        it('should handle null URL', () => {
            const data = new PrivacyData(null);
            expect(data.url).toBeNull();
            expect(data.hostname).toBeNull();
        });
    });

    describe('addCookie', () => {
        it('should add first-party cookie', () => {
            const cookie = {
                name: 'session',
                domain: 'example.com',
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: 'Lax',
                expirationDate: Date.now() / 1000 + 3600
            };

            privacyData.addCookie(cookie);

            expect(privacyData.cookies.firstParty).toHaveLength(1);
            expect(privacyData.cookies.thirdParty).toHaveLength(0);
            expect(privacyData.cookies.firstParty[0].name).toBe('session');
        });

        it('should add third-party cookie', () => {
            const cookie = {
                name: 'tracker',
                domain: 'tracker.com',
                path: '/',
                secure: false,
                httpOnly: false,
                sameSite: 'None'
            };

            privacyData.addCookie(cookie);

            expect(privacyData.cookies.thirdParty).toHaveLength(1);
            expect(privacyData.cookies.firstParty).toHaveLength(0);
        });

        it('should identify tracking cookies', () => {
            const cookie = {
                name: '_ga_tracking',
                domain: 'example.com',
                path: '/',
                secure: true,
                httpOnly: false,
                sameSite: 'None'
            };

            privacyData.addCookie(cookie);

            expect(privacyData.cookies.tracking).toHaveLength(1);
            expect(privacyData.cookies.tracking[0].name).toBe('_ga_tracking');
        });

        it('should categorize session cookies', () => {
            const cookie = {
                name: 'session',
                domain: 'example.com',
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: 'Lax'
                // No expirationDate = session cookie
            };

            privacyData.addCookie(cookie);

            expect(privacyData.cookies.session).toHaveLength(1);
        });
    });

    describe('addStorageItem', () => {
        it('should add localStorage item', () => {
            privacyData.addStorageItem('localStorage', 'key1', 'value1');

            expect(privacyData.storage.localStorage).toHaveLength(1);
            expect(privacyData.storage.localStorage[0].key).toBe('key1');
            expect(privacyData.storage.localStorage[0].value).toBe('value1');
        });

        it('should add sessionStorage item', () => {
            privacyData.addStorageItem('sessionStorage', 'key2', 'value2');

            expect(privacyData.storage.sessionStorage).toHaveLength(1);
            expect(privacyData.storage.sessionStorage[0].key).toBe('key2');
        });
    });

    describe('addTrackingScript', () => {
        it('should add tracking script', () => {
            privacyData.addTrackingScript('https://analytics.google.com/script.js', 'analytics');

            expect(privacyData.tracking.scripts).toHaveLength(1);
            expect(privacyData.tracking.scripts[0].url).toBe('https://analytics.google.com/script.js');
        });

        it('should categorize analytics scripts', () => {
            privacyData.addTrackingScript('https://www.google-analytics.com/ga.js', 'script');

            expect(privacyData.tracking.analytics).toHaveLength(1);
        });

        it('should categorize social media scripts', () => {
            privacyData.addTrackingScript('https://connect.facebook.net/sdk.js', 'script');

            expect(privacyData.tracking.socialMedia).toHaveLength(1);
        });

        it('should categorize advertising scripts', () => {
            privacyData.addTrackingScript('https://doubleclick.net/ad.js', 'script');

            expect(privacyData.tracking.advertising).toHaveLength(1);
        });
    });

    describe('addNetworkRequest', () => {
        it('should add third-party request', () => {
            privacyData.addNetworkRequest('https://thirdparty.com/api', true);

            expect(privacyData.networkRequests.thirdParty).toHaveLength(1);
        });

        it('should add tracking request', () => {
            privacyData.addNetworkRequest('https://tracker.com/track', false);

            expect(privacyData.networkRequests.tracking).toHaveLength(1);
        });

        it('should identify data broker requests', () => {
            privacyData.addNetworkRequest('https://acxiom.com/data', true);

            expect(privacyData.networkRequests.dataBrokers).toHaveLength(1);
        });
    });

    describe('setPrivacyPolicy', () => {
        it('should set privacy policy information', () => {
            privacyData.setPrivacyPolicy('https://example.com/privacy', 'Summary text');

            expect(privacyData.privacyPolicy.found).toBe(true);
            expect(privacyData.privacyPolicy.url).toBe('https://example.com/privacy');
            expect(privacyData.privacyPolicy.summary).toBe('Summary text');
        });
    });

    describe('getTrackingCount', () => {
        it('should return total tracking elements', () => {
            privacyData.addCookie({ name: '_ga', domain: 'example.com', path: '/' });
            privacyData.addTrackingScript('https://tracker.com/script.js', 'script');
            privacyData.addNetworkRequest('https://tracker.com/track', false);

            expect(privacyData.getTrackingCount()).toBe(3);
        });
    });

    describe('getSummary', () => {
        it('should return summary statistics', () => {
            privacyData.addCookie({ name: 'cookie1', domain: 'example.com', path: '/' });
            privacyData.addCookie({ name: 'cookie2', domain: 'tracker.com', path: '/' });
            privacyData.addStorageItem('localStorage', 'key1', 'value1');
            privacyData.addTrackingScript('https://tracker.com/script.js', 'script');
            privacyData.addNetworkRequest('https://thirdparty.com/api', true);
            privacyData.setPrivacyPolicy('https://example.com/privacy');

            const summary = privacyData.getSummary();

            expect(summary.totalCookies).toBe(2);
            expect(summary.thirdPartyCookies).toBe(1);
            expect(summary.storageItems).toBe(1);
            expect(summary.trackingScripts).toBe(1);
            expect(summary.thirdPartyRequests).toBe(1);
            expect(summary.privacyPolicyFound).toBe(true);
        });
    });

    describe('helper methods', () => {
        it('should identify tracking cookies correctly', () => {
            const trackingCookie = { name: '_ga_tracking', domain: 'example.com' };
            const normalCookie = { name: 'session', domain: 'example.com' };

            expect(privacyData.isTrackingCookie(trackingCookie)).toBe(true);
            expect(privacyData.isTrackingCookie(normalCookie)).toBe(false);
        });

        it('should identify analytics scripts', () => {
            expect(privacyData.isAnalyticsScript('https://google-analytics.com/ga.js')).toBe(true);
            expect(privacyData.isAnalyticsScript('https://example.com/script.js')).toBe(false);
        });

        it('should identify social media scripts', () => {
            expect(privacyData.isSocialMediaScript('https://facebook.com/sdk.js')).toBe(true);
            expect(privacyData.isSocialMediaScript('https://example.com/script.js')).toBe(false);
        });

        it('should extract domain from URL', () => {
            expect(privacyData.extractDomain('https://example.com/path')).toBe('example.com');
            expect(privacyData.extractDomain('invalid-url')).toBeNull();
        });
    });
});

