const tl = require('azure-pipelines-task-lib/task');
const akeylessApi = require('./akeyless_api');
const akeyless = require('akeyless');

function getDynamicSecret(api, secretName, variableName, akeylessToken) {
  return new Promise((resolve, reject) => {
    return api
      .getDynamicSecretValue(
        akeyless.GetDynamicSecretValue.constructFromObject({
          token: akeylessToken,
          name: secretName
        })
      )
      .then(dynamicSecret => {
        tl.setSecret(dynamicSecret);

        let toEnvironment = dynamicSecret;

        if (dynamicSecret.constructor === Array || dynamicSecret.constructor === Object) {
          toEnvironment = JSON.stringify(dynamicSecret);
        }

        tl.setTaskVariable(variableName, toEnvironment, true);

        resolve({variableName: dynamicSecret});
      })
      .catch(error => {
        reject(error);
      });
  });
}

function getStaticSecret(api, name, variableName, akeylessToken) {
  return new Promise((resolve, reject) => {
    return api
      .getSecretValue(
        akeyless.GetSecretValue.constructFromObject({
          token: akeylessToken,
          names: [name]
        })
      )
      .then(staticSecret => {
        const secretValue = staticSecret[name];
        tl.setSecret(secretValue);

        tl.setTaskVariable(variableName, secretValue, true);

        resolve(variableName, secretValue);
      })
      .catch(error => {
        reject(error);
      });
  });
}

function exportDynamicSecrets(akeylessToken, dynamicSecrets, apiUrl) {
  const api = akeylessApi.api(apiUrl);
  const toAwait = [];
  for (const [akeylessPath, variableName] of Object.entries(dynamicSecrets)) {
    toAwait.push(getDynamicSecret(api, akeylessPath, variableName, akeylessToken));
  }
  return toAwait;
}

async function exportStaticSecrets(akeylessToken, staticSecrets, apiUrl) {
  const api = akeylessApi.api(apiUrl);
  const toAwait = [];
  for (const [akeylessPath, variableName] of Object.entries(staticSecrets)) {
    toAwait.push(getStaticSecret(api, akeylessPath, variableName, akeylessToken));
  }
  return toAwait;
}

exports.exportDynamicSecrets = exportDynamicSecrets;
exports.exportStaticSecrets = exportStaticSecrets;
