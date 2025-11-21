jest.mock('azure-pipelines-task-lib/task');

const SDK = require('azure-pipelines-task-lib/task');
const input = require('../src/input');

describe('input.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readInputs', () => {
    test('should read all inputs correctly with required parameters', () => {
      // Arrange
      SDK.getInput = jest
        .fn()
        .mockReturnValueOnce('p-test-access-id') // accessId
        .mockReturnValueOnce('test-jwt-token') // azureJwt
        .mockReturnValueOnce('https://api.akeyless.io') // apiUrl
        .mockReturnValueOnce('{"static1": "output1"}') // staticSecrets
        .mockReturnValueOnce('{"dynamic1": "output2"}') // dynamicSecrets
        .mockReturnValueOnce('30') // requestTimeout
        .mockReturnValueOnce('true'); // autogenerate

      // Act
      const result = input.readInputs();

      // Assert
      expect(result).toEqual({
        accessId: 'p-test-access-id',
        azureJwt: 'test-jwt-token',
        apiUrl: 'https://api.akeyless.io',
        staticSecrets: '{"static1": "output1"}',
        dynamicSecrets: '{"dynamic1": "output2"}',
        requestTimeout: '30',
        autogenerate: 'true'
      });

      expect(SDK.getInput).toHaveBeenCalledWith('accessId', true);
      expect(SDK.getInput).toHaveBeenCalledWith('azureJwt', true);
      expect(SDK.getInput).toHaveBeenCalledWith('apiUrl');
      expect(SDK.getInput).toHaveBeenCalledWith('staticSecrets');
      expect(SDK.getInput).toHaveBeenCalledWith('dynamicSecrets');
      expect(SDK.getInput).toHaveBeenCalledWith('timeout');
      expect(SDK.getInput).toHaveBeenCalledWith('autogenerate');
    });

    test('should handle empty optional inputs', () => {
      // Arrange
      SDK.getInput = jest
        .fn()
        .mockReturnValueOnce('p-test-access-id') // accessId
        .mockReturnValueOnce('test-jwt-token') // azureJwt
        .mockReturnValueOnce('') // apiUrl - empty
        .mockReturnValueOnce('') // staticSecrets - empty
        .mockReturnValueOnce('') // dynamicSecrets - empty
        .mockReturnValueOnce('') // requestTimeout - empty
        .mockReturnValueOnce(''); // autogenerate - empty

      // Act
      const result = input.readInputs();

      // Assert
      expect(result).toEqual({
        accessId: 'p-test-access-id',
        azureJwt: 'test-jwt-token',
        apiUrl: '',
        staticSecrets: '',
        dynamicSecrets: '',
        requestTimeout: '',
        autogenerate: ''
      });
    });

    test('should handle null values', () => {
      // Arrange
      SDK.getInput = jest
        .fn()
        .mockReturnValueOnce('p-test-access-id') // accessId
        .mockReturnValueOnce('test-jwt-token') // azureJwt
        .mockReturnValueOnce(null) // apiUrl - null
        .mockReturnValueOnce(null) // staticSecrets - null
        .mockReturnValueOnce(null) // dynamicSecrets - null
        .mockReturnValueOnce(null) // requestTimeout - null
        .mockReturnValueOnce(null); // autogenerate - null

      // Act
      const result = input.readInputs();

      // Assert
      expect(result).toEqual({
        accessId: 'p-test-access-id',
        azureJwt: 'test-jwt-token',
        apiUrl: null,
        staticSecrets: null,
        dynamicSecrets: null,
        requestTimeout: null,
        autogenerate: null
      });
    });

    test('should handle only required inputs provided', () => {
      // Arrange
      SDK.getInput = jest
        .fn()
        .mockReturnValueOnce('p-minimal-access-id') // accessId
        .mockReturnValueOnce('minimal-jwt-token') // azureJwt
        .mockReturnValueOnce(undefined) // apiUrl
        .mockReturnValueOnce(undefined) // staticSecrets
        .mockReturnValueOnce(undefined) // dynamicSecrets
        .mockReturnValueOnce(undefined) // requestTimeout
        .mockReturnValueOnce(undefined); // autogenerate

      // Act
      const result = input.readInputs();

      // Assert
      expect(result.accessId).toBe('p-minimal-access-id');
      expect(result.azureJwt).toBe('minimal-jwt-token');
      expect(result.apiUrl).toBeUndefined();
      expect(result.staticSecrets).toBeUndefined();
      expect(result.dynamicSecrets).toBeUndefined();
      expect(result.requestTimeout).toBeUndefined();
      expect(result.autogenerate).toBeUndefined();
    });

    test('should handle complex JSON strings in secrets inputs', () => {
      // Arrange
      const complexStaticSecrets = JSON.stringify({
        '/path/to/secret1': 'output_var1',
        '/complex/path/secret2': 'output_var2'
      });
      const complexDynamicSecrets = JSON.stringify({
        '/dynamic/secret/path': 'dynamic_output',
        '/another/dynamic/path': 'another_output'
      });

      SDK.getInput = jest
        .fn()
        .mockReturnValueOnce('p-complex-id') // accessId
        .mockReturnValueOnce('complex-jwt') // azureJwt
        .mockReturnValueOnce('https://custom.akeyless.io') // apiUrl
        .mockReturnValueOnce(complexStaticSecrets) // staticSecrets
        .mockReturnValueOnce(complexDynamicSecrets) // dynamicSecrets
        .mockReturnValueOnce('60') // requestTimeout
        .mockReturnValueOnce('false'); // autogenerate

      // Act
      const result = input.readInputs();

      // Assert
      expect(result.staticSecrets).toBe(complexStaticSecrets);
      expect(result.dynamicSecrets).toBe(complexDynamicSecrets);
      expect(JSON.parse(result.staticSecrets)).toEqual({
        '/path/to/secret1': 'output_var1',
        '/complex/path/secret2': 'output_var2'
      });
      expect(JSON.parse(result.dynamicSecrets)).toEqual({
        '/dynamic/secret/path': 'dynamic_output',
        '/another/dynamic/path': 'another_output'
      });
    });
  });
});
