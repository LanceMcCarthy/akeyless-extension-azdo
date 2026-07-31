const akeylessApi = require('../src/akeyless_api');

describe('akeyless_api.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('api', () => {
    test('should create API client with default URL', () => {
      // Arrange
      const mockApiClient = {
        basePath: ''
      };
      const mockV2Api = {};

      const mockSdk = {
        ApiClient: vi.fn().mockImplementation(function () {
          return mockApiClient;
        }),
        V2Api: vi.fn().mockImplementation(function () {
          return mockV2Api;
        })
      };

      const testUrl = 'https://api.akeyless.io';

      // Act
      const result = akeylessApi.api(testUrl, mockSdk);

      // Assert
      expect(mockSdk.ApiClient).toHaveBeenCalledWith();
      expect(mockApiClient.basePath).toBe(testUrl);
      expect(mockSdk.V2Api).toHaveBeenCalledWith(mockApiClient);
      expect(result).toBe(mockV2Api);
    });

    test('should create API client with custom URL', () => {
      // Arrange
      const mockApiClient = {
        basePath: ''
      };
      const mockV2Api = {};

      const mockSdk = {
        ApiClient: vi.fn().mockImplementation(function () {
          return mockApiClient;
        }),
        V2Api: vi.fn().mockImplementation(function () {
          return mockV2Api;
        })
      };

      const customUrl = 'https://custom.akeyless.example.com';

      // Act
      const result = akeylessApi.api(customUrl, mockSdk);

      // Assert
      expect(mockSdk.ApiClient).toHaveBeenCalledWith();
      expect(mockApiClient.basePath).toBe(customUrl);
      expect(mockSdk.V2Api).toHaveBeenCalledWith(mockApiClient);
      expect(result).toBe(mockV2Api);
    });

    test('should handle undefined URL', () => {
      // Arrange
      const mockApiClient = {
        basePath: ''
      };
      const mockV2Api = {};

      const mockSdk = {
        ApiClient: vi.fn().mockImplementation(function () {
          return mockApiClient;
        }),
        V2Api: vi.fn().mockImplementation(function () {
          return mockV2Api;
        })
      };

      // Act
      const result = akeylessApi.api(undefined, mockSdk);

      // Assert
      expect(mockSdk.ApiClient).toHaveBeenCalledWith();
      expect(mockApiClient.basePath).toBeUndefined();
      expect(mockSdk.V2Api).toHaveBeenCalledWith(mockApiClient);
      expect(result).toBe(mockV2Api);
    });

    test('should handle empty string URL', () => {
      // Arrange
      const mockApiClient = {
        basePath: ''
      };
      const mockV2Api = {};

      const mockSdk = {
        ApiClient: vi.fn().mockImplementation(function () {
          return mockApiClient;
        }),
        V2Api: vi.fn().mockImplementation(function () {
          return mockV2Api;
        })
      };

      // Act
      const result = akeylessApi.api('', mockSdk);

      // Assert
      expect(mockSdk.ApiClient).toHaveBeenCalledWith();
      expect(mockApiClient.basePath).toBe('');
      expect(mockSdk.V2Api).toHaveBeenCalledWith(mockApiClient);
      expect(result).toBe(mockV2Api);
    });
  });
});
