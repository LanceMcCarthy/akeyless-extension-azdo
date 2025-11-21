jest.mock('azure-pipelines-task-lib/task');
jest.mock('akeyless');
jest.mock('../src/helpers');

const SDK = require('azure-pipelines-task-lib/task');
const akeyless = require('akeyless');
const helpers = require('../src/helpers');
const secrets = require('../src/secrets');

describe('secrets.js', () => {
  let mockApi;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log

    // Setup default mock API
    mockApi = {
      getSecretValue: jest.fn(),
      getDynamicSecretValue: jest.fn()
    };

    // Setup default SDK mocks
    SDK.setResult = jest.fn();
    SDK.TaskResult = {
      Failed: 'Failed'
    };
  });

  describe('getStatic', () => {
    test('should successfully fetch static secrets', async () => {
      // Arrange
      const staticSecrets = '{"path1": "output1", "path2": "output2"}';
      const akeylessToken = 'test-token';
      const timeout = 30;
      const mockSecretResult = {
        path1: 'secret-value-1',
        path2: 'secret-value-2'
      };

      const mockStaticOpts = {
        token: akeylessToken,
        names: ['path1', 'path2'],
        timeout: timeout
      };

      akeyless.GetSecretValue.constructFromObject = jest.fn().mockReturnValue(mockStaticOpts);
      mockApi.getSecretValue.mockResolvedValue(mockSecretResult);
      helpers.processStaticSecretResponse = jest.fn();

      // Act
      await secrets.getStatic(mockApi, staticSecrets, akeylessToken, timeout);

      // Assert
      expect(akeyless.GetSecretValue.constructFromObject).toHaveBeenCalledWith({
        token: akeylessToken,
        names: ['path1', 'path2'],
        timeout: timeout
      });
      expect(mockApi.getSecretValue).toHaveBeenCalledWith(mockStaticOpts);

      // Wait for promise resolution
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(helpers.processStaticSecretResponse).toHaveBeenCalledWith({path1: 'output1', path2: 'output2'}, mockSecretResult);
      expect(console.log).toHaveBeenCalledWith('🔓[Static Secrets] Processing static secrets... \'{"path1": "output1", "path2": "output2"}\'');
    });

    test('should handle invalid JSON in staticSecrets', async () => {
      // Arrange
      const invalidJsonSecrets = 'invalid-json';
      const akeylessToken = 'test-token';
      const timeout = 30;
      helpers.generalFail = jest.fn();

      // Act
      await secrets.getStatic(mockApi, invalidJsonSecrets, akeylessToken, timeout);

      // Assert
      expect(helpers.generalFail).toHaveBeenCalledWith('Something went wrong during deserialization of staticSecrets input: SyntaxError: Unexpected token \'i\', \"invalid-json\" is not valid JSON. [IMPORTANT] Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo.');
    });

    test('should handle API error for static secrets', async () => {
      // Arrange
      const staticSecrets = '{"path1": "output1"}';
      const akeylessToken = 'test-token';
      const timeout = 30;
      const apiError = new Error('API Error');

      akeyless.GetSecretValue.constructFromObject = jest.fn().mockReturnValue({});
      mockApi.getSecretValue.mockRejectedValue(apiError);

      // Act
      await secrets.getStatic(mockApi, staticSecrets, akeylessToken, timeout);

      // Assert
      // Wait for promise rejection
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(SDK.setResult).toHaveBeenCalledWith(SDK.TaskResult.Failed, "Could not fetch one or more static secrets. Check the secret's path Error: {}.", false);
    });
  });

  describe('getDynamic', () => {
    test('should successfully fetch dynamic secrets', async () => {
      // Arrange
      const dynamicSecrets = '{"dynamic-path1": "output1", "dynamic-path2": "output2"}';
      const akeylessToken = 'test-token';
      const timeout = 30;
      const autogenerate = 'true';
      const mockDynamicResult = {
        access_key: 'test-access-key',
        secret_key: 'test-secret-key'
      };

      const mockDynamicOpts = {
        token: akeylessToken,
        name: 'dynamic-path1',
        timeout: timeout,
        json: true
      };

      akeyless.GetDynamicSecretValue.constructFromObject = jest.fn().mockReturnValue(mockDynamicOpts);
      mockApi.getDynamicSecretValue.mockResolvedValue(mockDynamicResult);
      helpers.processDynamicSecretResponse = jest.fn();

      // Act
      await secrets.getDynamic(mockApi, dynamicSecrets, akeylessToken, timeout, autogenerate);

      // Assert
      expect(akeyless.GetDynamicSecretValue.constructFromObject).toHaveBeenCalledWith({
        token: akeylessToken,
        name: 'dynamic-path1',
        timeout: timeout,
        json: true
      });
      expect(mockApi.getDynamicSecretValue).toHaveBeenCalledWith(mockDynamicOpts);

      // Wait for promise resolution
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(helpers.processDynamicSecretResponse).toHaveBeenCalledWith('dynamic-path1', 'output1', mockDynamicResult, autogenerate);
      expect(console.log).toHaveBeenCalledWith('🔓 [Dynamic Secrets] Processing dynamic secrets... \'{"dynamic-path1": "output1", "dynamic-path2": "output2"}\'');
      expect(console.log).toHaveBeenCalledWith("Fetching 'dynamic-path1'...");
    });

    test('should handle multiple dynamic secrets', async () => {
      // Arrange
      const dynamicSecrets = '{"dynamic-path1": "output1", "dynamic-path2": "output2"}';
      const akeylessToken = 'test-token';
      const timeout = 30;
      const autogenerate = 'false';

      const mockResult1 = {key1: 'value1'};
      const mockResult2 = {key2: 'value2'};

      akeyless.GetDynamicSecretValue.constructFromObject = jest.fn().mockReturnValueOnce({token: akeylessToken, name: 'dynamic-path1', timeout, json: true}).mockReturnValueOnce({token: akeylessToken, name: 'dynamic-path2', timeout, json: true});

      mockApi.getDynamicSecretValue.mockResolvedValueOnce(mockResult1).mockResolvedValueOnce(mockResult2);

      helpers.processDynamicSecretResponse = jest.fn();

      // Act
      await secrets.getDynamic(mockApi, dynamicSecrets, akeylessToken, timeout, autogenerate);

      // Assert
      expect(akeyless.GetDynamicSecretValue.constructFromObject).toHaveBeenCalledTimes(2);
      expect(mockApi.getDynamicSecretValue).toHaveBeenCalledTimes(2);

      // Wait for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(helpers.processDynamicSecretResponse).toHaveBeenCalledWith('dynamic-path1', 'output1', mockResult1, autogenerate);
      expect(helpers.processDynamicSecretResponse).toHaveBeenCalledWith('dynamic-path2', 'output2', mockResult2, autogenerate);
    });

    test('should handle invalid JSON in dynamicSecrets', async () => {
      // Arrange
      const invalidJsonSecrets = 'invalid-json';
      const akeylessToken = 'test-token';
      const timeout = 30;
      const autogenerate = 'true';
      helpers.generalFail = jest.fn();

      // Act
      await secrets.getDynamic(mockApi, invalidJsonSecrets, akeylessToken, timeout, autogenerate);

      // Assert
      expect(helpers.generalFail).toHaveBeenCalledWith('Something went wrong during deserialization of dynamicSecrets input. Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo');
    });

    test('should handle API error for dynamic secrets', async () => {
      // Arrange
      const dynamicSecrets = '{"dynamic-path1": "output1"}';
      const akeylessToken = 'test-token';
      const timeout = 30;
      const autogenerate = 'false';
      const apiError = new Error('Dynamic API Error');

      akeyless.GetDynamicSecretValue.constructFromObject = jest.fn().mockReturnValue({});
      mockApi.getDynamicSecretValue.mockRejectedValue(apiError);

      // Act
      await secrets.getDynamic(mockApi, dynamicSecrets, akeylessToken, timeout, autogenerate);

      // Assert
      // Wait for promise rejection
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(SDK.setResult).toHaveBeenCalledWith(SDK.TaskResult.Failed, "Could not fetch 'dynamic-path1'. Error: {}.", false);
    });

    test('should handle empty dynamic secrets object', async () => {
      // Arrange
      const dynamicSecrets = '{}';
      const akeylessToken = 'test-token';
      const timeout = 30;
      const autogenerate = 'true';

      // Act
      await secrets.getDynamic(mockApi, dynamicSecrets, akeylessToken, timeout, autogenerate);

      // Assert
      expect(mockApi.getDynamicSecretValue).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith("🔓 [Dynamic Secrets] Processing dynamic secrets... '{}'");
    });
  });
});
