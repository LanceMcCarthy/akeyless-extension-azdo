jest.mock('azure-pipelines-task-lib/task');

const SDK = require('azure-pipelines-task-lib/task');
const helpers = require('../src/helpers');

describe('helpers.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log

    // Setup SDK mocks
    SDK.setVariable = jest.fn();
    SDK.setResult = jest.fn();
    SDK.TaskResult = {
      Failed: 'Failed'
    };
  });

  describe('processStaticSecretResponse', () => {
    test('should process static secrets correctly', () => {
      // Arrange
      const staticSecretsDictionary = {
        '/path/secret1': 'output1',
        '/path/secret2': 'output2'
      };
      const secretResult = {
        '/path/secret1': 'secret-value-1',
        '/path/secret2': 'secret-value-2'
      };

      // Act
      helpers.processStaticSecretResponse(staticSecretsDictionary, secretResult);

      // Assert
      expect(SDK.setVariable).toHaveBeenCalledWith('output1', 'secret-value-1', true, true);
      expect(SDK.setVariable).toHaveBeenCalledWith('output2', 'secret-value-2', true, true);
      expect(console.log).toHaveBeenCalledWith("✅ '/path/secret1' => output: output1, value: secret-value-1");
      expect(console.log).toHaveBeenCalledWith("✅ '/path/secret2' => output: output2, value: secret-value-2");
    });

    test('should handle undefined secret values with warning', () => {
      // Arrange
      const staticSecretsDictionary = {
        '/path/secret1': 'output1',
        '/path/secret2': 'output2'
      };
      const secretResult = {
        '/path/secret1': 'secret-value-1',
        '/path/secret2': undefined
      };

      // Act
      helpers.processStaticSecretResponse(staticSecretsDictionary, secretResult);

      // Assert
      expect(SDK.setVariable).toHaveBeenCalledWith('output1', 'secret-value-1', true, true);
      expect(SDK.setVariable).toHaveBeenCalledTimes(1); // Only called for non-undefined value
      expect(console.log).toHaveBeenCalledWith("⚠️ [Warning] '/path/secret2' has no value, please verify the secret is properly configured in akeyless.");
    });
  });

  describe('processDynamicSecretResponse', () => {
    test('should process dynamic secrets with autogenerate disabled', () => {
      // Arrange
      const akeylessPath = '/dynamic/secret';
      const outputPrefix = 'myOutput';
      const secretResult = {
        access_key: 'test-access-key',
        secret_key: 'test-secret-key'
      };
      const autogenerate = 'false';

      // Act
      helpers.processDynamicSecretResponse(akeylessPath, outputPrefix, secretResult, autogenerate);

      // Assert
      const expectedJson = JSON.stringify(secretResult);
      expect(SDK.setVariable).toHaveBeenCalledWith(outputPrefix, expectedJson, true, true);
      expect(console.log).toHaveBeenCalledWith(`✅ Output: ${outputPrefix} (complete response) => '${akeylessPath}'`);
    });

    test('should process dynamic secrets with autogenerate enabled', () => {
      // Arrange
      const akeylessPath = '/dynamic/secret';
      const outputPrefix = 'myOutput';
      const secretResult = {
        access_key: 'test-access-key',
        secret_key: 'test-secret-key'
      };
      const autogenerate = 'true';

      // Act
      helpers.processDynamicSecretResponse(akeylessPath, outputPrefix, secretResult, autogenerate);

      // Assert
      // Should set individual variables
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_access_key', 'test-access-key', true, true);
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_secret_key', 'test-secret-key', true, true);
      // And the complete JSON
      const expectedJson = JSON.stringify(secretResult);
      expect(SDK.setVariable).toHaveBeenCalledWith(outputPrefix, expectedJson, true, true);
      expect(console.log).toHaveBeenCalledWith('🛠️ Autogenerate enabled, creating separate outputs...');
    });

    test('should handle nested objects when autogenerate is enabled', () => {
      // Arrange
      const akeylessPath = '/dynamic/secret';
      const outputPrefix = 'myOutput';
      const secretResult = {
        credentials: {
          access_key: 'nested-access-key',
          secret_key: 'nested-secret-key'
        },
        metadata: {
          region: 'us-east-1'
        }
      };
      const autogenerate = 'true';

      // Act
      helpers.processDynamicSecretResponse(akeylessPath, outputPrefix, secretResult, autogenerate);

      // Assert
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_credentials_access_key', 'nested-access-key', true, true);
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_credentials_secret_key', 'nested-secret-key', true, true);
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_metadata_region', 'us-east-1', true, true);
    });

    test('should handle JSON string values when autogenerate is enabled', () => {
      // Arrange
      const akeylessPath = '/dynamic/secret';
      const outputPrefix = 'myOutput';
      const secretResult = {
        config: '{"timeout": 30, "retries": 3}',
        simple_key: 'simple_value'
      };
      const autogenerate = 'true';

      // Act
      helpers.processDynamicSecretResponse(akeylessPath, outputPrefix, secretResult, autogenerate);

      // Assert
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_config_timeout', '30', true, true);
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_config_retries', '3', true, true);
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_simple_key', 'simple_value', true, true);
    });

    test('should handle null and undefined values', () => {
      // Arrange
      const akeylessPath = '/dynamic/secret';
      const outputPrefix = 'myOutput';
      const secretResult = {
        null_value: null,
        undefined_value: undefined,
        valid_value: 'test'
      };
      const autogenerate = 'true';

      // Act
      helpers.processDynamicSecretResponse(akeylessPath, outputPrefix, secretResult, autogenerate);

      // Assert
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_null_value', '', true, true);
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_undefined_value', '', true, true);
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_valid_value', 'test', true, true);
      expect(console.log).toHaveBeenCalledWith('✅ Output: myOutput_null_value => . (⚠️ empty ⚠️ This was null/undefined.)');
      expect(console.log).toHaveBeenCalledWith('✅ Output: myOutput_undefined_value => . (⚠️ empty ⚠️ This was null/undefined.)');
    });
  });

  describe('generalFail', () => {
    test('should set task result to failed with message', () => {
      // Arrange
      const errorMessage = 'Something went wrong';

      // Act
      helpers.generalFail(errorMessage);

      // Assert
      expect(SDK.setResult).toHaveBeenCalledWith(SDK.TaskResult.Failed, `❌ ${errorMessage}`, true);
    });
  });
});
