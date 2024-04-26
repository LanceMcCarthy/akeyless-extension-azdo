const SDK = require('azure-pipelines-task-lib/task');
const akeylessApi = require('./akeyless_api');
const akeyless = require('akeyless');

async function exportDynamicSecrets(akeylessToken, dynamicSecrets, apiUrl) {
  const api = akeylessApi.api(apiUrl);

  // Deserialize the input so we can get a dictionary the dynamic secret's path and the variable name to use for output
  let secretsDictionary = (secretsDictionary = JSON.parse(dynamicSecrets));

  if (secretsDictionary === undefined) {
    SDK.setResult(
      SDK.TaskResult.Failed,
      `Something went wrong during input deserialization of dynamicSecrets. Check the JSON string is in the expected format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`
    );
  }

  for (const akeylessPath of Object.keys(secretsDictionary)) {
    // Get user's desired name for the variable
    let variableName = secretsDictionary[akeylessPath];

    // Let the user know we are attempting to get (this helps significantly when troubleshooting a problem).
    console.log(`Requesting ${akeylessPath} from akeyless, to be exported in ${variableName}...`);

    toAwait.push(getDynamicSecret(api, akeylessPath, variableName, akeylessToken));
  }
}

async function exportStaticSecrets(akeylessToken, staticSecrets, apiUrl) {
  const api = akeylessApi.api(apiUrl);

  // Deserialize the input so we can get a dictionary of secret paths and it's desired output variable name
  const secretsDictionary = JSON.parse(staticSecrets);

  if (secretsDictionary === undefined) {
    SDK.setResult(
      SDK.TaskResult.Failed,
      `Something went wrong during input deserialization of staticSecrets. Check the JSON string is in the expected format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`
    );
  }

  // GET SECRETS
  for (const akeylessPath of Object.keys(secretsDictionary)) {
    // Get user's desired name for the variable
    let variableName = secretsDictionary[akeylessPath];

    // Let the user know we are attempting to get (this helps significantly when troubleshooting a problem).
    console.log(`Requesting ${akeylessPath} from akeyless, to be exported in ${variableName}...`);

    toAwait.push(getStaticSecret(api, akeylessPath, secretsDictionary[akeylessPath], akeylessToken));
  }
}

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
        let toEnvironment = dynamicSecret;

        // if this is an object, may need to serialize it
        if (dynamicSecret.constructor === Array || dynamicSecret.constructor === Object) {
          toEnvironment = JSON.stringify(dynamicSecret);
        }

        SDK.setTaskVariable(variableName, toEnvironment, true, true);

        console.log(`✅ Success! '${secretName}' was fetched, the value will be available in the '${variableName}' output variable.`);

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

        SDK.setVariable(variableName, secretValue, true, true);

        console.log(`✅ Success! '${secretName}' was fetched, the value will be available in the '${variableName}' output variable.`);

        resolve(variableName, secretValue);
      })
      .catch(error => {
        reject(JSON.stringify(error));
      });
  });
}

function fail(name, errorText) {
  // Fail if there was troubvle getting any expected secret
  SDK.setResult(SDK.TaskResult.Failed, `Could not fetch '${name}'. Error: ${errorText}.`);
}

exports.exportDynamicSecrets = exportDynamicSecrets;
exports.exportStaticSecrets = exportStaticSecrets;
