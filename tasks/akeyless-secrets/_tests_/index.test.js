const SDK = require('azure-pipelines-task-lib/task');
const helpers = require('../src/helpers');
const auth = require('../src/auth');
const secrets = require('../src/secrets');
const input = require('../src/input');
const akeylessApi = require('../src/akeyless_api');
const index = require('../src/index');

describe('index.js', () => {
  let mockApi;

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn(); // Mock console.log

    mockApi = {
      auth: vi.fn(),
      getSecretValue: vi.fn(),
      getDynamicSecretValue: vi.fn()
    };

    // Setup default mocks
    akeylessApi.api = vi.fn().mockReturnValue(mockApi);
    auth.getAkeylessToken = vi.fn().mockResolvedValue('test-token');
    secrets.getStatic = vi.fn().mockResolvedValue();
    secrets.getDynamic = vi.fn().mockResolvedValue();
    helpers.generalFail = vi.fn();

    SDK.debug = vi.fn();
    SDK.error = vi.fn();
    SDK.setResult = vi.fn();
    SDK.TaskResult = {
      Failed: 'Failed'
    };
  });

  describe('run', () => {
    test('should complete full flow with static and dynamic secrets', async () => {
      // Arrange
      const mockInputs = {
        accessId: 'p-test-id',
        azureJwt: 'test-jwt',
        apiUrl: 'https://api.akeyless.io',
        staticSecrets: '{"secret1": "output1"}',
        dynamicSecrets: '{"dynamic1": "output2"}',
        requestTimeout: '30',
        autogenerate: 'true'
      };

      input.readInputs = vi.fn().mockReturnValue(mockInputs);

      // Act
      await index.run();

      // Assert
      expect(input.readInputs).toHaveBeenCalledWith();
      expect(akeylessApi.api).toHaveBeenCalledWith(mockInputs.apiUrl);
      expect(auth.getAkeylessToken).toHaveBeenCalledWith(mockApi, mockInputs.accessId, mockInputs.azureJwt);
      expect(secrets.getStatic).toHaveBeenCalledWith(mockApi, mockInputs.staticSecrets, 'test-token', mockInputs.requestTimeout);
      expect(secrets.getDynamic).toHaveBeenCalledWith(mockApi, mockInputs.dynamicSecrets, 'test-token', mockInputs.requestTimeout, mockInputs.autogenerate);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("🔔 Important Reminder: To reference a task's outputs"));
    });

    test('should handle only static secrets', async () => {
      // Arrange
      const mockInputs = {
        accessId: 'p-test-id',
        azureJwt: 'test-jwt',
        apiUrl: 'https://api.akeyless.io',
        staticSecrets: '{"secret1": "output1"}',
        dynamicSecrets: null,
        requestTimeout: '30',
        autogenerate: 'false'
      };

      input.readInputs = vi.fn().mockReturnValue(mockInputs);

      // Act
      await index.run();

      // Assert
      expect(secrets.getStatic).toHaveBeenCalledWith(mockApi, mockInputs.staticSecrets, 'test-token', mockInputs.requestTimeout);
      expect(secrets.getDynamic).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('🔒 [Dynamic Secrets] No dynamicSecrets value provided, skipping request.');
    });

    test('should handle only dynamic secrets', async () => {
      // Arrange
      const mockInputs = {
        accessId: 'p-test-id',
        azureJwt: 'test-jwt',
        apiUrl: 'https://api.akeyless.io',
        staticSecrets: null,
        dynamicSecrets: '{"dynamic1": "output1"}',
        requestTimeout: '30',
        autogenerate: 'true'
      };

      input.readInputs = vi.fn().mockReturnValue(mockInputs);

      // Act
      await index.run();

      // Assert
      expect(secrets.getStatic).not.toHaveBeenCalled();
      expect(secrets.getDynamic).toHaveBeenCalledWith(mockApi, mockInputs.dynamicSecrets, 'test-token', mockInputs.requestTimeout, mockInputs.autogenerate);
      expect(console.log).toHaveBeenCalledWith('🔒 [Static Secrets] No staticSecrets value provided, skipping request.');
    });

    test('should handle empty secrets (no static or dynamic)', async () => {
      // Arrange
      const mockInputs = {
        accessId: 'p-test-id',
        azureJwt: 'test-jwt',
        apiUrl: 'https://api.akeyless.io',
        staticSecrets: null,
        dynamicSecrets: null,
        requestTimeout: '30',
        autogenerate: 'false'
      };

      input.readInputs = vi.fn().mockReturnValue(mockInputs);

      // Act
      await index.run();

      // Assert
      expect(auth.getAkeylessToken).toHaveBeenCalled();
      expect(secrets.getStatic).not.toHaveBeenCalled();
      expect(secrets.getDynamic).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('🔒 [Static Secrets] No staticSecrets value provided, skipping request.');
      expect(console.log).toHaveBeenCalledWith('🔒 [Dynamic Secrets] No dynamicSecrets value provided, skipping request.');
    });

    test('should handle authentication failure', async () => {
      // Arrange
      const mockInputs = {
        accessId: 'p-test-id',
        azureJwt: 'test-jwt',
        apiUrl: 'https://api.akeyless.io',
        staticSecrets: '{"secret1": "output1"}',
        dynamicSecrets: '{"dynamic1": "output1"}',
        requestTimeout: '30',
        autogenerate: 'true'
      };

      input.readInputs = vi.fn().mockReturnValue(mockInputs);
      auth.getAkeylessToken = vi.fn().mockResolvedValue(undefined); // Auth returns undefined

      // Act
      await index.run();

      // Assert
      expect(helpers.generalFail).toHaveBeenCalledWith("Unexpected failure. The akeyless token is empty even though you're authenticated, please double check the inputs or open an issue at https://github.com/LanceMcCarthy/akeyless-extension-azdo.");
      // The code continues executing even after generalFail is called
      expect(secrets.getStatic).toHaveBeenCalledWith(mockApi, mockInputs.staticSecrets, undefined, mockInputs.requestTimeout);
      expect(secrets.getDynamic).toHaveBeenCalledWith(mockApi, mockInputs.dynamicSecrets, undefined, mockInputs.requestTimeout, mockInputs.autogenerate);
    });

    test('should handle empty string secrets as falsy', async () => {
      // Arrange
      const mockInputs = {
        accessId: 'p-test-id',
        azureJwt: 'test-jwt',
        apiUrl: 'https://api.akeyless.io',
        staticSecrets: '',
        dynamicSecrets: '',
        requestTimeout: '30',
        autogenerate: 'false'
      };

      input.readInputs = vi.fn().mockReturnValue(mockInputs);

      // Act
      await index.run();

      // Assert
      expect(secrets.getStatic).not.toHaveBeenCalled();
      expect(secrets.getDynamic).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('🔒 [Static Secrets] No staticSecrets value provided, skipping request.');
      expect(console.log).toHaveBeenCalledWith('🔒 [Dynamic Secrets] No dynamicSecrets value provided, skipping request.');
    });

    test('should use default API URL when not provided', async () => {
      // Arrange
      const mockInputs = {
        accessId: 'p-test-id',
        azureJwt: 'test-jwt',
        apiUrl: undefined, // No API URL provided
        staticSecrets: null,
        dynamicSecrets: null,
        requestTimeout: '30',
        autogenerate: 'false'
      };

      input.readInputs = vi.fn().mockReturnValue(mockInputs);

      // Act
      await index.run();

      // Assert
      expect(akeylessApi.api).toHaveBeenCalledWith(undefined);
    });
  });

  describe('executeAsMain', () => {
    test('should call run and log debug information', () => {
      const runSpy = vi.spyOn(index, 'run').mockResolvedValue();

      index.executeAsMain();

      expect(SDK.debug).toHaveBeenCalledWith('Starting main run');
      expect(runSpy).toHaveBeenCalled();

      runSpy.mockRestore();
    });

    test('should handle errors thrown during run execution', () => {
      const error = new Error('boom');
      const runSpy = vi.spyOn(index, 'run').mockImplementation(() => {
        throw error;
      });

      index.executeAsMain();

      expect(SDK.debug).toHaveBeenCalledWith(error.stack);
      expect(SDK.error).toHaveBeenCalledWith(error.message);
      expect(SDK.setResult).toHaveBeenCalledWith(SDK.TaskResult.Failed, error.message);

      runSpy.mockRestore();
    });
  });

  describe('autoExecuteWhenMain', () => {
    test('should execute when module matches require.main', () => {
      const fakeModule = {};
      const executeSpy = vi.spyOn(index, 'executeAsMain').mockReturnValue();

      index.autoExecuteWhenMain(fakeModule, fakeModule);

      expect(executeSpy).toHaveBeenCalled();

      executeSpy.mockRestore();
    });

    test('should not execute when module differs from require.main', () => {
      const fakeModule = {};
      const anotherModule = {};
      const executeSpy = vi.spyOn(index, 'executeAsMain').mockReturnValue();

      index.autoExecuteWhenMain(fakeModule, anotherModule);

      expect(executeSpy).not.toHaveBeenCalled();

      executeSpy.mockRestore();
    });
  });
});
