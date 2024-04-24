const SDK = require('azure-pipelines-task-lib/task');
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
        // if (exportSecretsToEnvironment) {
        //   SDK.setSecret(dynamicSecret);
        // }

        let toEnvironment = dynamicSecret;

        // if this is an object, may need to serialize it
        if (dynamicSecret.constructor === Array || dynamicSecret.constructor === Object) {
          toEnvironment = JSON.stringify(dynamicSecret);
        }

        SDK.setTaskVariable(variableName, toEnvironment, true, true);

        resolve({variableName: dynamicSecret});
      })
      .catch(error => {
        reject(JSON.stringify(error));
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

        // if (exportSecretsToEnvironment) {
        //   SDK.setSecret(secretValue);
        // }

        SDK.setVariable(variableName, secretValue, true, true);

        resolve(variableName, secretValue);
      })
      .catch(error => {
        reject(JSON.stringify(error));
        //reject(error);
      });
  });
}

async function exportDynamicSecrets(akeylessToken, dynamicSecrets, apiUrl) {
  const api = akeylessApi.api(apiUrl);
  const toAwait = [];

  let secretsDictionary = (secretsDictionary = JSON.parse(dynamicSecrets));

  if (secretsDictionary === undefined) {
    SDK.setResult(
      SDK.TaskResult.Failed,
      `Something went wrong during input deserialization of dynamicSecrets. Check the JSON string is in the expected format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`
    );
  }

  for (const akeylessPath of Object.keys(secretsDictionary)) {
    let variableName = secretsDictionary[akeylessPath];

    console.log(`Requesting ${akeylessPath} from akeyless, to be exported in ${variableName}...`);

    toAwait.push(getDynamicSecret(api, akeylessPath, variableName, akeylessToken));
  }
  return toAwait;
}

async function exportStaticSecrets(akeylessToken, staticSecrets, apiUrl) {
  const api = akeylessApi.api(apiUrl);
  const toAwait = [];

  const secretsDictionary = JSON.parse(staticSecrets);

  if (secretsDictionary === undefined) {
    SDK.setResult(
      SDK.TaskResult.Failed,
      `Something went wrong during input deserialization of staticSecrets. Check the JSON string is in the expected format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`
    );
  }

  for (const akeylessPath of Object.keys(secretsDictionary)) {
    let variableName = secretsDictionary[akeylessPath];

    console.log(`Requesting ${akeylessPath} from akeyless, to be exported in ${variableName}...`);

    toAwait.push(getStaticSecret(api, akeylessPath, secretsDictionary[akeylessPath], akeylessToken));
  }

  return toAwait;
}

exports.exportDynamicSecrets = exportDynamicSecrets;
exports.exportStaticSecrets = exportStaticSecrets;
