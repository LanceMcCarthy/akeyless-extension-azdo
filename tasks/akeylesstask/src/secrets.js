const tl = require('azure-pipelines-task-lib/task');
const akeylessApi = require('./akeyless_api');
const akeyless = require('akeyless');

function getDynamicSecret(api, secretName, variableName, akeylessToken, exportSecretsToEnvironment, exportSecretsToOutputs) {
  return new Promise((resolve, reject) => {
    return api
      .getDynamicSecretValue(
        akeyless.GetDynamicSecretValue.constructFromObject({
          token: akeylessToken,
          name: secretName
        })
      )
      .then(dynamicSecret => {
        if (exportSecretsToEnvironment) {
          tl.setSecret(dynamicSecret);
        }

        let toEnvironment = dynamicSecret;

        if (dynamicSecret.constructor === Array || dynamicSecret.constructor === Object) {
          toEnvironment = JSON.stringify(dynamicSecret);
        }

        tl.setTaskVariable(variableName, toEnvironment, true, exportSecretsToOutputs);

        resolve({variableName: dynamicSecret});
      })
      .catch(error => {
        reject(error);
      });
  });
}

function getStaticSecret(api, name, variableName, akeylessToken, exportSecretsToEnvironment, exportSecretsToOutputs) {
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

        if (exportSecretsToEnvironment) {
          tl.setSecret(secretValue);
        }

        tl.setVariable(variableName, secretValue, true, exportSecretsToOutputs);

        resolve(variableName, secretValue);
      })
      .catch(error => {
        reject(error);
      });
  });
}

function exportDynamicSecrets(akeylessToken, dynamicSecrets, apiUrl, exportSecretsToEnvironment, exportSecretsToOutputs) {
  const api = akeylessApi.api(apiUrl);
  const toAwait = [];
  for (const [akeylessPath, variableName] of Object.entries(dynamicSecrets)) {
    toAwait.push(getDynamicSecret(api, akeylessPath, variableName, akeylessToken, exportSecretsToEnvironment, exportSecretsToOutputs));
  }
  return toAwait;
}

async function exportStaticSecrets(akeylessToken, staticSecrets, apiUrl, exportSecretsToEnvironment, exportSecretsToOutputs) {
  const api = akeylessApi.api(apiUrl);
  const toAwait = [];
  for (const [akeylessPath, variableName] of Object.entries(staticSecrets)) {
    toAwait.push(getStaticSecret(api, akeylessPath, variableName, akeylessToken, exportSecretsToEnvironment, exportSecretsToOutputs));
  }
  return toAwait;
}

exports.exportDynamicSecrets = exportDynamicSecrets;
exports.exportStaticSecrets = exportStaticSecrets;
