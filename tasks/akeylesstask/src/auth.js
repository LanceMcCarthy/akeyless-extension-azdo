const tl = require('azure-pipelines-task-lib/task');
const akeylessApi = require('./akeyless_api');
const akeyless = require('akeyless');

async function akeylessLogin(accessId, azureJwt, apiUrl) {
  try {
    tl.debug('fetch token');

    const api = akeylessApi.api(apiUrl);
    tl.debug('Fetching token from AKeyless');

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
  tl.debug(message);
  tl.setResult(tl.TaskResult.Failed, message);
  throw new Error(message);
}

exports.akeylessLogin = akeylessLogin;
