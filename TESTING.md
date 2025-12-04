# Testing Setup and Guide

## Overview

Phase 4 testing has been set up with Jest for unit and integration tests. The test suite covers models, controllers, and services.

## Installation

Install Jest and testing dependencies:

```bash
npm install
```

This will install:
- `jest` - Testing framework
- `@jest/globals` - Jest globals for ES modules
- `jest-environment-jsdom` - DOM environment for tests

## Test Structure

```
src/tests/
├── unit/
│   ├── models/
│   │   ├── PrivacyData.test.js
│   │   ├── PrivacyScore.test.js
│   │   └── Website.test.js
│   └── controllers/
│       ├── WebsiteController.test.js
│       ├── PopupController.test.js
│       └── PrivacyDataController.test.js
└── integration/
    └── services/
        ├── StorageService.test.js
        ├── BrowserAPIService.test.js
        ├── WebRequestService.test.js
        └── PrivacyPolicyService.test.js
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Coverage

The project is configured to require **80% code coverage** for:
- Branches
- Functions
- Lines
- Statements

Coverage reports are generated in the `coverage/` directory.

## Test Files

### Unit Tests - Models

#### PrivacyData.test.js
- Tests cookie categorization (first-party, third-party, tracking)
- Tests storage item tracking
- Tests tracking script detection and categorization
- Tests network request tracking
- Tests privacy policy detection
- Tests summary generation
- Tests helper methods for tracking identification

#### PrivacyScore.test.js
- Tests score calculation algorithm
- Tests penalty buckets for scripts, cookies, requests
- Tests rating categories (Excellent, Good, Fair, Poor, Very Poor)
- Tests recommendation generation
- Tests factors object population
- Tests edge cases (no data, perfect score, maximum penalties)

#### Website.test.js
- Tests Website model initialization
- Tests URL validation
- Tests special page detection
- Tests URL display truncation

### Unit Tests - Controllers

#### WebsiteController.test.js
- Tests website processing
- Tests secure/insecure URL detection
- Tests error handling

#### PopupController.test.js
- Tests message passing to background
- Tests response handling
- Tests error scenarios (lastError, null response)

#### PrivacyDataController.test.js
- Tests privacy data collection initialization
- Tests network request monitoring
- Tests cookie collection
- Tests privacy policy detection
- Tests data update notifications
- Tests storage operations

### Integration Tests - Services

#### StorageService.test.js
- Tests save/retrieve/clear operations
- Tests error handling
- Tests full workflow (save → get → clear)
- Tests multiple keys handling

#### BrowserAPIService.test.js
- Tests tab querying
- Tests tab URL retrieval
- Tests tab update listeners
- Tests tab activation listeners
- Tests error handling

#### WebRequestService.test.js
- Tests request monitoring setup
- Tests tracking request identification
- Tests third-party request detection
- Tests cookie detection from headers
- Tests listener registration/removal

#### PrivacyPolicyService.test.js
- Tests privacy policy link detection in HTML
- Tests keyword matching
- Tests URL existence checking
- Tests policy summary extraction

## Mocking

Chrome APIs are mocked in `jest.setup.js`:
- `chrome.runtime`
- `chrome.tabs`
- `chrome.storage`
- `chrome.cookies`
- `chrome.webRequest`

## Writing New Tests

### Example Unit Test Structure

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { YourClass } from '../../../../path/to/YourClass.js';

describe('YourClass', () => {
    let instance;

    beforeEach(() => {
        instance = new YourClass();
    });

    describe('methodName', () => {
        it('should do something', () => {
            const result = instance.methodName();
            expect(result).toBe(expectedValue);
        });
    });
});
```

### Example Integration Test Structure

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { YourService } from '../../../../services/YourService.js';

describe('YourService Integration', () => {
    let service;

    beforeEach(() => {
        service = new YourService();
        jest.clearAllMocks();
    });

    describe('methodName', () => {
        it('should integrate with Chrome APIs', async () => {
            chrome.api.method.mockResolvedValue({ data: 'value' });
            const result = await service.methodName();
            expect(result).toBeDefined();
        });
    });
});
```

## Coverage Goals

Current coverage targets:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

Run `npm run test:coverage` to check current coverage levels.

## Next Steps

1. Run `npm install` to install dependencies
2. Run `npm test` to execute all tests
3. Review coverage report with `npm run test:coverage`
4. Add more tests as needed to reach 80% coverage
5. Fix any failing tests

## Notes

- Tests use ES modules (`import/export`)
- Chrome APIs are mocked for testing
- Tests are isolated and can run independently
- Integration tests verify service interactions with Chrome APIs

