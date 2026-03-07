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
      expect(console.log).toHaveBeenCalledWith("✅ '/path/secret1' => output: output1 (secret value redacted)");
      expect(console.log).toHaveBeenCalledWith("✅ '/path/secret2' => output: output2 (secret value redacted)");
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

    test('should allow multiline static secrets without requiring pipeline env changes', () => {
      // Arrange
      const originalAllowMultiline = process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET;
      delete process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET;

      SDK.setVariable = jest.fn((name, value, secret, isOutput) => {
        expect(name).toBe('privateKeyOutput');
        expect(value).toBe('line1\nline2');
        expect(secret).toBe(true);
        expect(isOutput).toBe(true);
        expect(process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET).toBe('TRUE');
      });

      const staticSecretsDictionary = {
        '/path/private-key': 'privateKeyOutput'
      };
      const secretResult = {
        '/path/private-key': 'line1\nline2'
      };

      try {
        // Act
        helpers.processStaticSecretResponse(staticSecretsDictionary, secretResult);

        // Assert
        expect(SDK.setVariable).toHaveBeenCalledTimes(1);
        expect(process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET).toBeUndefined();
      } finally {
        if (originalAllowMultiline !== undefined) {
          process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET = originalAllowMultiline;
        } else {
          delete process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET;
        }
      }
    });

    test('should preserve RSA private key multiline value when setting static secret outputs', () => {
      // Arrange
      const originalAllowMultiline = process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET;
      delete process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET;

      const rsaPrivateKey = `-----BEGIN RSA PRIVATE KEY-----
8P9d61xphReeoxlOrHZLKHwri/JOiIB3/pvnTeT9gbk8lrf1wvC3CtHzS8EW+MzU
JClyiR3qPndT4JzeC9bgRCOS8qWmF8KeDtgmGkr6NcNnFELq7AFP4FxgUwY7s5Lb
NtqS8Vx4ewijN8YF3GYOg6+2+WGiqMLbMGDFjpywkqpsmB0ZGtsaW6NNxIoeJ/ni
2HiHmv1eNlj5DEt7Qxjm37iDPoArfHAIQrAQBwIDAQABAoIBAEeDe2ES9U+nQgbq
8tHKrW/erwi6V8J6m3C5JtrOfZXUpiVV5//Uz4qKWiK1woqcv/jUfallPJQqAIZj
tjmpfjbAgdRUrUa9YtvV79eGofup4H9+6fP1ZrNwHUnMw33ADbJtn99poL3emWq5
Iojzi6O3qN/FrAufLD4g7rbTB+0VMxMnLTqDiKVv0MBrfG73j2yxx0iVnh8or2PY
APEoB0K71MKH32M/WHtnQKPBzKOnO0ya9ZHVttsW3nJB8pzESDic8KuE4u7DjLVq
MIIEowIBAAKCAQEAld8l0zD5JRrMk1PXXpzGyF4I1hkFaN5i+4TPX5fwlGsbyLG3
XsfwqLWaC4JZvBploj9DWa4wceIWo6btQP0TNurKxNfk7LQFJK+N0Id2uqT0LQtV
Oks2hwKWxCSzOE7sEYQEoN+B01CHQk1MxLw79SjYYxcW9qqXTx3lPetDNQT08rfi
63XPC0ECgYEAx0HjhxwtLp5VqFMHnUG+oQSib5ByVTu2RTSo+ZAhC/z1JX5Jsq6C
20lpRekX1AU2OHqWH0NtvHveByalvX9FjLZ1Iie2yekyv+/3eZWqxnpKZYDnmjC2
uyr/DAS5qdxp+Xme6WInayz8HhN4MCb+iF3P0Ducxr+uRXHEbFnfW5UCgYEAwIz6
t9TU4UgJPQGJismqcvT9IltObWrpO/qudj/nCYXlt2QA3DCVMz03vFXyOVlfYOhA
oSBTB3BWvkViyr/YhC0JiXc8dXLjizguVsEECsr9sM/y6nyVMEovczm/YE1JUDHN
G0/vIHNlJ+jFjy+2s3V1ZNT0X+Quoowpx9jhdisCgYEAxMkZwFHffW76AacemfxY
HAXLtordn7e9J1P+nZnuSTylj0XN2x3mNlOmGFlAIzCSf+zxXibltYRPnphYj3Gm
anW38Odv6rDYYh7INdfONP6Jgv1vviPmE6s+/8ua4VrBfpTSkINTktF2nO11gXjB
YEPl/S0ihFbB8euNpcSMhpECgYAonNO4+HQaPDZunqdjFZwU+SV3HKkTHQyqsPoh
SOMzOAG2x6oCx2CA2TWrTLl1bStX5kTTd1zr4b76DOqEdyh04Ib1bqfa4euqjqP/
emCe4ifWJlZHLRXOhKczd4etCUAgYRCw5RA72PsKCue4hsjTWz/yj5QnsZpAgK3D
vwIGaaaUPr0L/NnGaiFSbzm+2VlunZp2g+Tzn9mxc6SW2egb+WRcUepVz4DrDfHM
UDRl1wKBgBWmY6RcjaF4XzJsa4WAl5YSZTR0Z+3RYJp2Z4nTH1q5RNnRLFoE1LC4
vp2PSQ3Hm+TnwqIENf5hgbbSun123Tjw8wrpM6zczcmKwUbV0h6/
-----END RSA PRIVATE KEY-----`;

      SDK.setVariable = jest.fn((name, value, secret, isOutput) => {
        expect(name).toBe('privateKeyOutput');
        expect(value).toBe(rsaPrivateKey);
        expect(secret).toBe(true);
        expect(isOutput).toBe(true);
        expect(process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET).toBe('TRUE');
      });

      const staticSecretsDictionary = {
        '/path/private-key': 'privateKeyOutput'
      };
      const secretResult = {
        '/path/private-key': rsaPrivateKey
      };

      try {
        // Act
        helpers.processStaticSecretResponse(staticSecretsDictionary, secretResult);

        // Assert
        expect(SDK.setVariable).toHaveBeenCalledTimes(1);
        expect(process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET).toBeUndefined();
      } finally {
        if (originalAllowMultiline !== undefined) {
          process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET = originalAllowMultiline;
        } else {
          delete process.env.SYSTEM_UNSAFEALLOWMULTILINESECRET;
        }
      }
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

    test('should handle JSON primitive string values when autogenerate is enabled', () => {
      // Arrange
      const akeylessPath = '/dynamic/secret';
      const outputPrefix = 'myOutput';
      const secretResult = {
        number_value: '42',
        bool_value: 'true'
      };
      const autogenerate = 'true';

      // Act
      helpers.processDynamicSecretResponse(akeylessPath, outputPrefix, secretResult, autogenerate);

      // Assert
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_number_value', '42', true, true);
      expect(SDK.setVariable).toHaveBeenCalledWith('myOutput_bool_value', 'true', true, true);
      expect(console.log).toHaveBeenCalledWith('✅ Output: myOutput_number_value (secret value redacted). (parsed JSON primitive)');
      expect(console.log).toHaveBeenCalledWith('✅ Output: myOutput_bool_value (secret value redacted). (parsed JSON primitive)');
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
      expect(console.log).toHaveBeenCalledWith('✅ Output: myOutput_null_value (secret value redacted). (⚠️ empty ⚠️ This was null/undefined.)');
      expect(console.log).toHaveBeenCalledWith('✅ Output: myOutput_undefined_value (secret value redacted). (⚠️ empty ⚠️ This was null/undefined.)');
    });

    test('should fail gracefully when processing throws', () => {
      // Arrange
      const akeylessPath = '/dynamic/secret';
      const outputPrefix = 'myOutput';
      const secretResult = {};
      secretResult.self = secretResult; // creates circular reference for JSON.stringify
      const autogenerate = 'false';

      // Act
      helpers.processDynamicSecretResponse(akeylessPath, outputPrefix, secretResult, autogenerate);

      // Assert
      expect(SDK.setResult).toHaveBeenCalledWith('Failed', expect.stringContaining('Processing the dynamic secret response failed.'), true);
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
