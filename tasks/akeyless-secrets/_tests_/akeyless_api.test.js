jest.mock('akeyless');

const akeyless = require('akeyless');
const akeylessApi = require('../src/akeyless_api');

describe('akeyless_api.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('api', () => {
    test('should create API client with default URL', () => {
      // Arrange
      const mockApiClient = {
        basePath: ''
      };
      const mockV2Api = {};

      akeyless.ApiClient = jest.fn().mockImplementation(() => mockApiClient);
      akeyless.V2Api = jest.fn().mockImplementation(() => mockV2Api);

      const testUrl = 'https://api.akeyless.io';

      // Act
      const result = akeylessApi.api(testUrl);

      // Assert
      expect(akeyless.ApiClient).toHaveBeenCalledWith();
      expect(mockApiClient.basePath).toBe(testUrl);
      expect(akeyless.V2Api).toHaveBeenCalledWith(mockApiClient);
      expect(result).toBe(mockV2Api);
    });

    test('should create API client with custom URL', () => {
      // Arrange
      const mockApiClient = {
        basePath: ''
      };
      const mockV2Api = {};

      akeyless.ApiClient = jest.fn().mockImplementation(() => mockApiClient);
      akeyless.V2Api = jest.fn().mockImplementation(() => mockV2Api);

      const customUrl = 'https://custom.akeyless.example.com';

      // Act
      const result = akeylessApi.api(customUrl);

      // Assert
      expect(akeyless.ApiClient).toHaveBeenCalledWith();
      expect(mockApiClient.basePath).toBe(customUrl);
      expect(akeyless.V2Api).toHaveBeenCalledWith(mockApiClient);
      expect(result).toBe(mockV2Api);
    });

    test('should handle undefined URL', () => {
      // Arrange
      const mockApiClient = {
        basePath: ''
      };
      const mockV2Api = {};

      akeyless.ApiClient = jest.fn().mockImplementation(() => mockApiClient);
      akeyless.V2Api = jest.fn().mockImplementation(() => mockV2Api);

      // Act
      const result = akeylessApi.api(undefined);

      // Assert
      expect(akeyless.ApiClient).toHaveBeenCalledWith();
      expect(mockApiClient.basePath).toBeUndefined();
      expect(akeyless.V2Api).toHaveBeenCalledWith(mockApiClient);
      expect(result).toBe(mockV2Api);
    });

    test('should handle empty string URL', () => {
      // Arrange
      const mockApiClient = {
        basePath: ''
      };
      const mockV2Api = {};

      akeyless.ApiClient = jest.fn().mockImplementation(() => mockApiClient);
      akeyless.V2Api = jest.fn().mockImplementation(() => mockV2Api);

      // Act
      const result = akeylessApi.api('');

      // Assert
      expect(akeyless.ApiClient).toHaveBeenCalledWith();
      expect(mockApiClient.basePath).toBe('');
      expect(akeyless.V2Api).toHaveBeenCalledWith(mockApiClient);
      expect(result).toBe(mockV2Api);
    });
  });
});
