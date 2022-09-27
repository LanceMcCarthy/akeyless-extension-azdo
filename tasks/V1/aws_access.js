const core = require('azure-pipelines-task-lib');
const akeylessApi = require('./akeyless_api');
const akeyless = require('akeyless');

async function awsLogin(akeylessToken, producerForAwsAccess, apiUrl) {
  const api = akeylessApi.api(apiUrl);
  return new Promise((resolve, reject) => {
    return api
      .getDynamicSecretValue(
        akeyless.GetDynamicSecretValue.constructFromObject({
          token: akeylessToken,
          name: producerForAwsAccess
        })
      )
      .then(awsCredentials => {
        const accessKeyId = awsCredentials['access_key_id'];
        const secretAccessKey = awsCredentials['secret_access_key'];
        const sessionToken = awsCredentials['security_token'];

        core.setSecret(accessKeyId);
        core.setVariable('AWS_ACCESS_KEY_ID', accessKeyId, true);
        core.setSecret(secretAccessKey);
        core.setVariable('AWS_SECRET_ACCESS_KEY', secretAccessKey, true);

        if (sessionToken) {
          core.setSecret(sessionToken);
          core.setVariable('AWS_SESSION_TOKEN', sessionToken, true);
        }
        resolve();
      })
      .catch(error => {
        reject(error);
      });
  });
}

exports.awsLogin = awsLogin;
