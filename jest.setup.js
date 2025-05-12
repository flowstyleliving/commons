require('@testing-library/jest-dom');

// Mock the fetch API
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
}); 