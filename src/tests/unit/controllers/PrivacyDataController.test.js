import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrivacyDataController } from '../../../../controllers/PrivacyDataController.js';
import { PrivacyData } from '../../../../models/PrivacyData.js';
import { WebRequestService } from '../../../../services/WebRequestService.js';
import { PrivacyPolicyService } from '../../../../services/PrivacyPolicyService.js';
import { StorageService } from '../../../../services/StorageService.js';

// Mock services
jest.mock('../../../../services/WebRequestService.js');
jest.mock('../../../../services/PrivacyPolicyService.js');
jest.mock('../../../../services/StorageService.js');

describe('PrivacyDataController', () => {
    let controller;
    let mockWebRequestService;
    let mockPrivacyPolicyService;
    let mockStorageService;

    beforeEach(() => {
        jest.clearAllMocks();
        chrome.runtime.sendMessage.mockClear();

        // Setup service mocks
        mockWebRequestService = {
            onRequest: jest.fn(),
            startMonitoring: jest.fn(),
            stopMonitoring: jest.fn(),
            removeListener: jest.fn()
        };

        mockPrivacyPolicyService = {
            detectPrivacyPolicy: jest.fn().mockResolvedValue(null)
        };

        mockStorageService = {
            save: jest.fn().mockResolvedValue(true),
            get: jest.fn().mockResolvedValue(null),
            clear: jest.fn().mockResolvedValue(true),
            clearAll: jest.fn().mockResolvedValue(true)
        };

        WebRequestService.mockImplementation(() => mockWebRequestService);
        PrivacyPolicyService.mockImplementation(() => mockPrivacyPolicyService);
        StorageService.mockImplementation(() => mockStorageService);

        controller = new PrivacyDataController();
    });

    describe('constructor', () => {
        it('should initialize with services', () => {
            expect(controller.webRequestService).toBeDefined();
            expect(controller.privacyPolicyService).toBeDefined();
            expect(controller.storageService).toBeDefined();
            expect(controller.currentPrivacyData).toBeNull();
        });
    });

    describe('initializeCollection', () => {
        it('should initialize collection for valid URL', async () => {
            chrome.cookies.getAll.mockResolvedValue([
                { name: 'cookie1', domain: 'example.com' }
            ]);

            const result = await controller.initializeCollection('https://example.com');

            expect(result).toBeInstanceOf(PrivacyData);
            expect(result.url).toBe('https://example.com');
            expect(mockWebRequestService.startMonitoring).toHaveBeenCalled();
        });

        it('should return null for invalid URL', async () => {
            const result = await controller.initializeCollection(null);

            expect(result).toBeNull();
        });

        it('should collect cookies on initialization', async () => {
            const cookies = [
                { name: 'cookie1', domain: 'example.com', path: '/' },
                { name: 'cookie2', domain: 'example.com', path: '/' }
            ];
            chrome.cookies.getAll.mockResolvedValue(cookies);

            await controller.initializeCollection('https://example.com');

            const privacyData = controller.getCurrentPrivacyData();
            expect(privacyData.cookies.firstParty.length).toBeGreaterThan(0);
        });

        it('should detect privacy policy on initialization', async () => {
            mockPrivacyPolicyService.detectPrivacyPolicy.mockResolvedValue('https://example.com/privacy');

            await controller.initializeCollection('https://example.com');

            expect(mockPrivacyPolicyService.detectPrivacyPolicy).toHaveBeenCalledWith('https://example.com');
            const privacyData = controller.getCurrentPrivacyData();
            expect(privacyData.privacyPolicy.found).toBe(true);
        });
    });

    describe('startMonitoring', () => {
        it('should start monitoring network requests', () => {
            controller.currentPrivacyData = new PrivacyData('https://example.com');
            controller.startMonitoring();

            expect(mockWebRequestService.onRequest).toHaveBeenCalled();
            expect(mockWebRequestService.startMonitoring).toHaveBeenCalled();
        });

        it('should handle cookie detection in requests', () => {
            controller.currentPrivacyData = new PrivacyData('https://example.com');
            controller.startMonitoring();

            const requestListener = mockWebRequestService.onRequest.mock.calls[0][0];
            const cookieData = {
                type: 'cookie',
                cookies: ['session=abc123; Path=/; Domain=example.com']
            };

            requestListener(cookieData);

            expect(controller.currentPrivacyData.cookies.firstParty.length).toBeGreaterThan(0);
        });

        it('should handle tracking script detection', () => {
            controller.currentPrivacyData = new PrivacyData('https://example.com');
            controller.startMonitoring();

            const requestListener = mockWebRequestService.onRequest.mock.calls[0][0];
            const scriptData = {
                type: 'script',
                url: 'https://tracker.com/script.js',
                isTracking: true
            };

            requestListener(scriptData);

            expect(controller.currentPrivacyData.tracking.scripts.length).toBeGreaterThan(0);
        });

        it('should handle network request detection', () => {
            controller.currentPrivacyData = new PrivacyData('https://example.com');
            controller.startMonitoring();

            const requestListener = mockWebRequestService.onRequest.mock.calls[0][0];
            const requestData = {
                url: 'https://thirdparty.com/api',
                isThirdParty: true,
                isTracking: false
            };

            requestListener(requestData);

            expect(controller.currentPrivacyData.networkRequests.thirdParty.length).toBeGreaterThan(0);
        });
    });

    describe('stopMonitoring', () => {
        it('should stop monitoring when called', () => {
            controller.currentPrivacyData = new PrivacyData('https://example.com');
            controller.startMonitoring();
            controller.stopMonitoring();

            expect(mockWebRequestService.removeListener).toHaveBeenCalled();
            expect(mockWebRequestService.stopMonitoring).toHaveBeenCalled();
        });
    });

    describe('collectCookies', () => {
        it('should collect cookies for domain', async () => {
            controller.currentPrivacyData = new PrivacyData('https://example.com');
            const cookies = [
                { name: 'cookie1', domain: 'example.com', path: '/' }
            ];
            chrome.cookies.getAll.mockResolvedValue(cookies);

            await controller.collectCookies('https://example.com');

            expect(chrome.cookies.getAll).toHaveBeenCalled();
            expect(controller.currentPrivacyData.cookies.firstParty.length).toBeGreaterThan(0);
        });

        it('should handle errors gracefully', async () => {
            controller.currentPrivacyData = new PrivacyData('https://example.com');
            chrome.cookies.getAll.mockRejectedValue(new Error('Permission denied'));

            await expect(controller.collectCookies('https://example.com')).resolves.not.toThrow();
        });
    });

    describe('parseCookieString', () => {
        it('should parse cookie string correctly', () => {
            const cookieString = 'session=abc123; Path=/; Domain=example.com; Secure; HttpOnly';
            const cookie = controller.parseCookieString(cookieString);

            expect(cookie.name).toBe('session');
            expect(cookie.value).toBe('abc123');
            expect(cookie.path).toBe('/');
            expect(cookie.domain).toBe('example.com');
            expect(cookie.secure).toBe(true);
            expect(cookie.httpOnly).toBe(true);
        });

        it('should handle minimal cookie string', () => {
            const cookieString = 'session=abc123';
            const cookie = controller.parseCookieString(cookieString);

            expect(cookie.name).toBe('session');
            expect(cookie.value).toBe('abc123');
        });

        it('should return null for invalid cookie string', () => {
            const cookie = controller.parseCookieString('invalid');
            expect(cookie).toBeNull();
        });
    });

    describe('setPrivacyPolicy', () => {
        it('should set privacy policy and notify update', () => {
            controller.currentPrivacyData = new PrivacyData('https://example.com');
            jest.useFakeTimers();

            controller.setPrivacyPolicy('https://example.com/privacy', 'Summary');

            expect(controller.currentPrivacyData.privacyPolicy.url).toBe('https://example.com/privacy');
            expect(controller.currentPrivacyData.privacyPolicy.summary).toBe('Summary');

            jest.advanceTimersByTime(300);
            expect(chrome.runtime.sendMessage).toHaveBeenCalled();

            jest.useRealTimers();
        });
    });

    describe('notifyUpdate', () => {
        it('should send update message with privacy data', () => {
            controller.currentPrivacyData = new PrivacyData('https://example.com');
            controller.currentPrivacyData.addCookie({ name: 'test', domain: 'example.com', path: '/' });
            jest.useFakeTimers();

            controller.notifyUpdate();

            jest.advanceTimersByTime(300);

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'privacyData:updated'
                }),
                expect.any(Function)
            );

            jest.useRealTimers();
        });

        it('should not send message if no privacy data', () => {
            controller.currentPrivacyData = null;
            controller.notifyUpdate();

            expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('getCurrentPrivacyData', () => {
        it('should return current privacy data', () => {
            const data = new PrivacyData('https://example.com');
            controller.currentPrivacyData = data;

            expect(controller.getCurrentPrivacyData()).toBe(data);
        });

        it('should return null if no data', () => {
            expect(controller.getCurrentPrivacyData()).toBeNull();
        });
    });

    describe('savePrivacyData', () => {
        it('should save privacy data to storage', async () => {
            controller.currentPrivacyData = new PrivacyData('https://example.com');

            const result = await controller.savePrivacyData();

            expect(result).toBe(true);
            expect(mockStorageService.save).toHaveBeenCalled();
        });

        it('should return false if no privacy data', async () => {
            controller.currentPrivacyData = null;

            const result = await controller.savePrivacyData();

            expect(result).toBe(false);
        });
    });

    describe('loadPrivacyData', () => {
        it('should load privacy data from storage', async () => {
            const savedData = {
                url: 'https://example.com',
                hostname: 'example.com',
                cookies: { firstParty: [], thirdParty: [], tracking: [], session: [] },
                storage: { localStorage: [], sessionStorage: [] },
                tracking: { scripts: [], pixels: [], analytics: [], socialMedia: [], advertising: [] },
                networkRequests: { thirdParty: [], tracking: [], dataBrokers: [] },
                privacyPolicy: { found: false, url: null, summary: null }
            };

            mockStorageService.get.mockResolvedValue(savedData);

            const result = await controller.loadPrivacyData('example.com');

            expect(result).toBeInstanceOf(PrivacyData);
            expect(result.url).toBe('https://example.com');
        });

        it('should return null if no data in storage', async () => {
            mockStorageService.get.mockResolvedValue(null);

            const result = await controller.loadPrivacyData('example.com');

            expect(result).toBeNull();
        });
    });
});

