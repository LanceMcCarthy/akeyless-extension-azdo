jest.mock('azure-pipelines-task-lib/task');
jest.mock('../src/akeyless_api');
jest.mock('akeyless');

SDK = require('azure-pipelines-task-lib/task');
akeylessApi = require('../src/akeyless_api');
akeyless = require('akeyless');
secrets = require('../src/secrets');

test('export dynamic secrets', async () => {
  const apiUrl = 'https://api.akeyless.io';
  const dynamicSecret = {
    access_key_id: 'aws-access-key',
    secret_access_key: 'aws-secret-key',
    session_token: 'aws-session-token'
  };

  SDK.setSecret = jest.fn(() => {});
  SDK.setVariable = jest.fn(() => {});

  api = jest.fn(() => {});
  api.getDynamicSecretValue = jest.fn(() => Promise.resolve(dynamicSecret));
  akeylessApi.api = jest.fn(() => api);
  akeyless.GetDynamicSecretValue.constructFromObject = jest.fn(() => 'get_dynamic_secret_body');

  await secrets.exportDynamicSecrets('akeyless-token', {'/path/to/dynamic-secret': 'sup'}, apiUrl, true, true);

  expect(api.getDynamicSecretValue).toHaveBeenCalledWith('get_dynamic_secret_body');
  expect(akeyless.GetDynamicSecretValue.constructFromObject).toHaveBeenCalledWith({
    token: 'akeyless-token',
    name: '/path/to/dynamic-secret'
  });

  //expect(SDK.setSecret).toHaveBeenCalledWith(dynamicSecret);
  //expect(SDK.setVariable).toHaveBeenCalledWith(dynamicSecret);
});

test('export dynamic secrets - separated', async () => {
  const apiUrl = 'https://api.akeyless.io';
  const dynamicSecret = {
    access_key_id: 'aws-access-key',
    secret_access_key: 'aws-secret-key',
    session_token: 'aws-session-token'
  };
  SDK.setSecret = jest.fn(() => {});
  SDK.setVariable = jest.fn(() => {});

  api = jest.fn(() => {});
  api.getDynamicSecretValue = jest.fn(() => Promise.resolve(dynamicSecret));
  akeylessApi.api = jest.fn(() => api);
  akeyless.GetDynamicSecretValue.constructFromObject = jest.fn(() => 'get_dynamic_secret_body');

  await secrets.exportDynamicSecrets('akeyless-token', {'/path/to/dynamic-secret': 'sup'}, apiUrl, true, true);

  expect(api.getDynamicSecretValue).toHaveBeenCalledWith('get_dynamic_secret_body');
  expect(akeyless.GetDynamicSecretValue.constructFromObject).toHaveBeenCalledWith({
    token: 'akeyless-token',
    name: '/path/to/dynamic-secret'
  });

  //expect(core.setSecret).toHaveBeenCalledWith('sup', dynamicSecret);
  //expect(core.setVariable).toHaveBeenCalledWith('sup', dynamicSecret);
  //expect(core.setVariable).toHaveBeenCalledWith('sup', JSON.stringify(dynamicSecret));
});

test('export static secrets', async () => {
  const apiUrl = 'https://api.akeyless.io';
  const staticSecret = {
    '/path/to/static/secret': 'super secret'
  };
  SDK.setSecret = jest.fn(() => {});
  SDK.setTaskVariable = jest.fn(() => {});

  const api = jest.fn(() => {});
  api.getSecretValue = jest.fn(() => Promise.resolve(staticSecret));
  akeylessApi.api = jest.fn(() => api);
  akeyless.GetSecretValue.constructFromObject = jest.fn(() => 'get_static_secret_body');

  await secrets.exportStaticSecrets('akeyless-token', {'/path/to/static/secret': 'sup'}, apiUrl, true, true);

  expect(api.getSecretValue).toHaveBeenCalledWith('get_static_secret_body');
  expect(akeyless.GetSecretValue.constructFromObject).toHaveBeenCalledWith({
    token: 'akeyless-token',
    names: ['/path/to/static/secret']
  });
  expect(SDK.setSecret).toHaveBeenCalledWith('super secret');
  expect(SDK.setVariable).toHaveBeenCalledWith('sup', 'super secret', true, true);
});
