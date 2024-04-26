//jest.mock('azure-pipelines-task-lib/task');
jest.mock('../src/akeyless_api');
jest.mock('akeyless');

//SDK = require('azure-pipelines-task-lib/task');
akeylessApi = require('../src/akeyless_api');
akeyless = require('akeyless');
auth = require('../src/auth');

test('mock jwt login', async () => {
  jwtToken = 'abiudsfkljbsdfvlijbkjsdflijbvsfdijnsdr;ijjbnwelkj.sdfvlkjsdfvlkjsdfvlkjnsdfvlkjnsdfv';

  api = jest.fn(() => {});
  api.auth = jest.fn(() => Promise.resolve({token: 'akeyless-token'}));
  akeylessApi.api = jest.fn(() => api);
  akeyless.Auth.constructFromObject = jest.fn(() => 'auth_body');

  await expect(auth.akeylessLogin('p-12345', jwtToken, 'https://api.akeyless.io')).resolves.toEqual({token: 'akeyless-token'});
  expect(api.auth).toHaveBeenCalledWith('auth_body');
});
