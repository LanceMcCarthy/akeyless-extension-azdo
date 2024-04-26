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

    // Create the request body
    const body = akeyless.GetSecretValue.constructFromObject({token: akeylessToken, names: [akeylessPath]});

    // Fetch the secret
    api
      .getSecretValue(body)
      .then(secretResult => success(variableName, secretResult[akeylessPath]))
      .catch(error => fail(variableName, JSON.stringify(error)));
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
    // Get the name to be used for the output variable
    let variableName = secretsDictionary[akeylessPath];

    // Let the user know we are attempting to get (this helps significantly when troubleshooting a problem).
    console.log(`Requesting '${akeylessPath}' from akeyless...`);

    // Create the request body
    const body = akeyless.GetSecretValue.constructFromObject({token: akeylessToken, names: [akeylessPath]});

    // Fetch the secret
    api
      .getSecretValue(body)
      .then(secretResult => success(variableName, secretResult[akeylessPath]))
      .catch(error => fail(variableName, JSON.stringify(error)));
  }
}

function success(name, value) {
  SDK.setVariable(name, value, true, true);

  console.log(
    `✅ Success! '${akeylessPath}' was fetched, the value will be available in the '${variableName}' output variable. !!! IMPORTANT !!! Make sure you have set the 'Output Variables > Reference Name' for your task or you will not be able to reference the output variable in subsequent tasks.`
  );
}

function fail(name, errorText) {
  // Fail if there was troubvle getting any expected secret
  SDK.setResult(SDK.TaskResult.Failed, `Could not fetch '${name}'. Error: ${errorText}.`);
}

exports.exportDynamicSecrets = exportDynamicSecrets;
exports.exportStaticSecrets = exportStaticSecrets;
