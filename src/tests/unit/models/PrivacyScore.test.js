import { describe, it, expect, beforeEach } from '@jest/globals';
import { PrivacyScore } from '../../../../models/PrivacyScore.js';
import { PrivacyData } from '../../../../models/PrivacyData.js';

describe('PrivacyScore', () => {
    let privacyData;
    let privacyScore;

    beforeEach(() => {
        privacyData = new PrivacyData('https://example.com');
        privacyScore = new PrivacyScore(privacyData);
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(privacyScore.data).toBe(privacyData);
            expect(privacyScore.score).toBe(100);
            expect(privacyScore.rating).toBe('Unknown');
            expect(privacyScore.factors).toEqual({});
            expect(privacyScore.recommendations).toEqual([]);
        });
    });

    describe('calculate - no data', () => {
        it('should return 0 score when no data provided', () => {
            const score = new PrivacyScore(null);
            score.calculate();

            expect(score.score).toBe(0);
            expect(score.rating).toBe('Unknown');
        });
    });

    describe('calculate - perfect score', () => {
        it('should return 100 for site with no tracking', () => {
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.score).toBe(100);
            expect(privacyScore.rating).toBe('Excellent');
        });
    });

    describe('calculate - script penalties', () => {
        it('should apply penalty for 1-3 scripts', () => {
            privacyData.addTrackingScript('https://tracker.com/1.js', 'script');
            privacyData.addTrackingScript('https://tracker.com/2.js', 'script');
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.factors.scriptPenalty).toBe(4);
            expect(privacyScore.score).toBe(96);
        });

        it('should apply penalty for 4-10 scripts', () => {
            for (let i = 0; i < 5; i++) {
                privacyData.addTrackingScript(`https://tracker.com/${i}.js`, 'script');
            }
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.factors.scriptPenalty).toBe(8);
            expect(privacyScore.score).toBe(92);
        });

        it('should apply maximum penalty for 21+ scripts', () => {
            for (let i = 0; i < 25; i++) {
                privacyData.addTrackingScript(`https://tracker.com/${i}.js`, 'script');
            }
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.factors.scriptPenalty).toBe(25);
            expect(privacyScore.score).toBe(75);
        });
    });

    describe('calculate - cookie penalties', () => {
        it('should apply penalty for tracking cookies', () => {
            privacyData.addCookie({ name: '_ga', domain: 'example.com', path: '/' });
            privacyData.addCookie({ name: '_fbp', domain: 'example.com', path: '/' });
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.factors.cookiePenalty).toBe(2);
            expect(privacyScore.score).toBe(98);
        });

        it('should apply maximum cookie penalty for 21+ cookies', () => {
            for (let i = 0; i < 25; i++) {
                privacyData.addCookie({ name: `_track${i}`, domain: 'example.com', path: '/' });
            }
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.factors.cookiePenalty).toBe(20);
        });
    });

    describe('calculate - request penalties', () => {
        it('should apply penalty for tracking requests', () => {
            for (let i = 0; i < 10; i++) {
                privacyData.addNetworkRequest(`https://tracker.com/track${i}`, false);
            }
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.factors.requestPenalty).toBe(2);
        });

        it('should apply higher penalty for many tracking requests', () => {
            for (let i = 0; i < 100; i++) {
                privacyData.addNetworkRequest(`https://tracker.com/track${i}`, false);
            }
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.factors.requestPenalty).toBe(12);
        });
    });

    describe('calculate - privacy policy penalty', () => {
        it('should apply penalty when no privacy policy found', () => {
            privacyData.addTrackingScript('https://tracker.com/script.js', 'script');
            privacyScore.calculate();

            expect(privacyScore.factors.policyPenalty).toBe(10);
            expect(privacyScore.score).toBeLessThan(100);
        });

        it('should not apply penalty when privacy policy found', () => {
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.factors.policyPenalty).toBe(0);
        });
    });

    describe('calculate - rating categories', () => {
        it('should rate Excellent for score >= 85', () => {
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.rating).toBe('Excellent');
        });

        it('should rate Good for score 70-84', () => {
            for (let i = 0; i < 8; i++) {
                privacyData.addTrackingScript(`https://tracker.com/${i}.js`, 'script');
            }
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.rating).toBe('Good');
            expect(privacyScore.score).toBeGreaterThanOrEqual(70);
            expect(privacyScore.score).toBeLessThan(85);
        });

        it('should rate Fair for score 55-69', () => {
            for (let i = 0; i < 12; i++) {
                privacyData.addTrackingScript(`https://tracker.com/${i}.js`, 'script');
            }
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.rating).toBe('Fair');
        });

        it('should rate Poor for score 40-54', () => {
            for (let i = 0; i < 20; i++) {
                privacyData.addTrackingScript(`https://tracker.com/${i}.js`, 'script');
            }
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.rating).toBe('Poor');
        });

        it('should rate Very Poor for score < 40', () => {
            for (let i = 0; i < 25; i++) {
                privacyData.addTrackingScript(`https://tracker.com/${i}.js`, 'script');
            }
            for (let i = 0; i < 25; i++) {
                privacyData.addCookie({ name: `_track${i}`, domain: 'example.com', path: '/' });
            }
            privacyScore.calculate();

            expect(privacyScore.rating).toBe('Very Poor');
            expect(privacyScore.score).toBeLessThan(40);
        });
    });

    describe('calculate - recommendations', () => {
        it('should recommend script blocker for many scripts', () => {
            for (let i = 0; i < 5; i++) {
                privacyData.addTrackingScript(`https://tracker.com/${i}.js`, 'script');
            }
            privacyScore.calculate();

            expect(privacyScore.recommendations.length).toBeGreaterThan(0);
            expect(privacyScore.recommendations.some(r => r.action.includes('script blocker'))).toBe(true);
        });

        it('should recommend privacy policy when not found', () => {
            privacyScore.calculate();

            expect(privacyScore.recommendations.some(r => r.action.includes('privacy policy'))).toBe(true);
        });

        it('should recommend for high tracking activity', () => {
            for (let i = 0; i < 70; i++) {
                privacyData.addNetworkRequest(`https://tracker.com/track${i}`, false);
            }
            privacyScore.calculate();

            expect(privacyScore.recommendations.some(r => r.action.includes('tracking activity'))).toBe(true);
        });
    });

    describe('calculate - factors object', () => {
        it('should populate factors with all penalty information', () => {
            privacyData.addTrackingScript('https://tracker.com/script.js', 'script');
            privacyData.addCookie({ name: '_ga', domain: 'example.com', path: '/' });
            privacyData.addNetworkRequest('https://tracker.com/track', false);
            privacyData.setPrivacyPolicy('https://example.com/privacy');
            privacyScore.calculate();

            expect(privacyScore.factors.scripts).toBe(1);
            expect(privacyScore.factors.cookies).toBe(1);
            expect(privacyScore.factors.trackingRequests).toBe(1);
            expect(privacyScore.factors.policyFound).toBe(true);
            expect(privacyScore.factors.totalPenalty).toBeDefined();
        });
    });

    describe('bucket helper method', () => {
        it('should return correct penalty for value in range', () => {
            const ranges = [
                { min: 0, max: 0, penalty: 0 },
                { min: 1, max: 5, penalty: 5 },
                { min: 6, max: 10, penalty: 10 }
            ];

            expect(privacyScore.bucket(0, ranges)).toBe(0);
            expect(privacyScore.bucket(3, ranges)).toBe(5);
            expect(privacyScore.bucket(8, ranges)).toBe(10);
        });

        it('should return 0 for value outside all ranges', () => {
            const ranges = [{ min: 1, max: 5, penalty: 5 }];
            expect(privacyScore.bucket(10, ranges)).toBe(0);
        });
    });
});

