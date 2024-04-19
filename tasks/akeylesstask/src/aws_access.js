const tl = require('azure-pipelines-task-lib/task');
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

        tl.setSecret(accessKeyId);
        tl.setVariable('AWS_ACCESS_KEY_ID', accessKeyId, true);
        tl.setSecret(secretAccessKey);
        tl.setVariable('AWS_SECRET_ACCESS_KEY', secretAccessKey, true);

        if (sessionToken) {
          tl.setSecret(sessionToken);
          tl.setVariable('AWS_SESSION_TOKEN', sessionToken, true);
        }
        resolve();
      })
      .catch(error => {
        reject(error);
      });
  });
}

exports.awsLogin = awsLogin;
