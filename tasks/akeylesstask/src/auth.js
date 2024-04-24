const SDK = require('azure-pipelines-task-lib/task');
const akeylessApi = require('./akeyless_api');
const akeyless = require('akeyless');

async function akeylessLogin(accessId, azureJwt, apiUrl) {
  try {
    SDK.debug('fetch token');

    const api = akeylessApi.api(apiUrl);
    SDK.debug('Fetching token from AKeyless');

    return api.auth(
      akeyless.Auth.constructFromObject({
        'access-type': 'jwt',
        'access-id': accessId,
        jwt: azureJwt
      })
    );
  } catch (error) {
    action_fail(`Failed to login to AKeyless: ${JSON.stringify(error.message)}`);
  }
}

function action_fail(message) {
  SDK.debug(message);
  SDK.setResult(SDK.TaskResult.Failed, message);
  throw new Error(message);
}

exports.akeylessLogin = akeylessLogin;
