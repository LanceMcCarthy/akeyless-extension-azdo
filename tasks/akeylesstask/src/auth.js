const tl = require('azure-pipelines-task-lib/task');
const akeylessApi = require('./akeyless_api');
const akeyless = require('akeyless');
const akeylessCloudId = require('akeyless-cloud-id');

function action_fail(message) {
  tl.debug(message);
  tl.setFailed(message);
  throw new Error(message);
}

async function jwtLogin(apiUrl, accessId) {
  const api = akeylessApi.api(apiUrl);
  tl.debug(apiUrl);
  let jwtToken = undefined;

  try {
    tl.debug('Fetching JWT from Azure DevOps');

    // TODO 
    // problem - I need a way to replace GitHub JWT auth when running in Azure DevOps
    jwtToken = await tl.getIDToken();

  } catch (error) {
    action_fail(`Failed to fetch Azure DevOps JWT: ${error.message}`);
  }
  try {
    tl.debug('Fetching token from AKeyless');
    return api.auth(
      akeyless.Auth.constructFromObject({
        'access-type': 'jwt',
        'access-id': accessId,
        jwt: jwtToken
      })
    );
  } catch (error) {
    action_fail(`Failed to login to AKeyless: ${error.message}`);
  }
}

async function awsIamLogin(apiUrl, accessId) {
  const api = akeylessApi.api(apiUrl);
  let cloudId = undefined;

  try {
    cloudId = await akeylessCloudId();
  } catch (error) {
    action_fail(`Failed to fetch cloud id: ${error.message}`);
  }

  if (cloudId === undefined) {
    action_fail(`CloudId is undefined.`);
  }

  try {
    return api.auth(
      akeyless.Auth.constructFromObject({
        'access-type': 'aws_iam',
        'access-id': accessId,
        'cloud-id': cloudId
      })
    );
  } catch (error) {
    action_fail(`Failed to login to AKeyless: ${error.message}`);
  }
}

const login = {
  jwt: jwtLogin,
  aws_iam: awsIamLogin
};

const allowedAccessTypes = Object.keys(login);

async function akeylessLogin(accessId, accessType, apiUrl) {
  try {
    tl.debug('fetch token');
    return login[accessType](apiUrl, accessId);
  } catch (error) {
    action_fail(error.message);
  }
}

exports.akeylessLogin = akeylessLogin;
exports.allowedAccessTypes = allowedAccessTypes;
