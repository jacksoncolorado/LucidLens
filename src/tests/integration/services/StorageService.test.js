import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { StorageService } from '../../../../services/StorageService.js';

describe('StorageService Integration', () => {
    let storageService;

    beforeEach(() => {
        storageService = new StorageService();
        chrome.storage.local.clear.mockClear();
    });

    afterEach(async () => {
        // Clean up after each test
        await storageService.clearAll();
    });

    describe('save', () => {
        it('should save data to chrome.storage.local', async () => {
            const result = await storageService.save('testKey', { data: 'testValue' });

            expect(result).toBe(true);
            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                { testKey: { data: 'testValue' } }
            );
        });

        it('should handle save errors gracefully', async () => {
            chrome.storage.local.set.mockRejectedValue(new Error('Storage quota exceeded'));

            const result = await storageService.save('testKey', 'value');

            expect(result).toBe(false);
        });

        it('should save different data types', async () => {
            await storageService.save('string', 'test');
            await storageService.save('number', 42);
            await storageService.save('object', { key: 'value' });
            await storageService.save('array', [1, 2, 3]);
            await storageService.save('boolean', true);

            expect(chrome.storage.local.set).toHaveBeenCalledTimes(5);
        });
    });

    describe('get', () => {
        it('should retrieve saved data', async () => {
            const testData = { data: 'testValue' };
            chrome.storage.local.get.mockResolvedValue({ testKey: testData });

            const result = await storageService.get('testKey');

            expect(result).toEqual(testData);
            expect(chrome.storage.local.get).toHaveBeenCalledWith('testKey');
        });

        it('should return null for non-existent key', async () => {
            chrome.storage.local.get.mockResolvedValue({});

            const result = await storageService.get('nonExistentKey');

            expect(result).toBeNull();
        });

        it('should handle get errors gracefully', async () => {
            chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

            const result = await storageService.get('testKey');

            expect(result).toBeNull();
        });
    });

    describe('clear', () => {
        it('should clear specific key', async () => {
            const result = await storageService.clear('testKey');

            expect(result).toBe(true);
            expect(chrome.storage.local.remove).toHaveBeenCalledWith('testKey');
        });

        it('should handle clear errors gracefully', async () => {
            chrome.storage.local.remove.mockRejectedValue(new Error('Clear error'));

            const result = await storageService.clear('testKey');

            expect(result).toBe(false);
        });
    });

    describe('clearAll', () => {
        it('should clear all storage', async () => {
            const result = await storageService.clearAll();

            expect(result).toBe(true);
            expect(chrome.storage.local.clear).toHaveBeenCalled();
        });

        it('should handle clearAll errors gracefully', async () => {
            chrome.storage.local.clear.mockRejectedValue(new Error('Clear error'));

            const result = await storageService.clearAll();

            expect(result).toBe(false);
        });
    });

    describe('full workflow', () => {
        it('should save, retrieve, and clear data', async () => {
            const testData = { privacy: 'data', score: 85 };

            // Save
            const saveResult = await storageService.save('privacyData', testData);
            expect(saveResult).toBe(true);

            // Retrieve
            chrome.storage.local.get.mockResolvedValue({ privacyData: testData });
            const getResult = await storageService.get('privacyData');
            expect(getResult).toEqual(testData);

            // Clear
            const clearResult = await storageService.clear('privacyData');
            expect(clearResult).toBe(true);
        });

        it('should handle multiple keys independently', async () => {
            await storageService.save('key1', 'value1');
            await storageService.save('key2', 'value2');
            await storageService.save('key3', 'value3');

            chrome.storage.local.get
                .mockResolvedValueOnce({ key1: 'value1' })
                .mockResolvedValueOnce({ key2: 'value2' })
                .mockResolvedValueOnce({ key3: 'value3' });

            const val1 = await storageService.get('key1');
            const val2 = await storageService.get('key2');
            const val3 = await storageService.get('key3');

            expect(val1).toBe('value1');
            expect(val2).toBe('value2');
            expect(val3).toBe('value3');
        });
    });
});

