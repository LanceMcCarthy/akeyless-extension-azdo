const SDK = require('azure-pipelines-task-lib/task');
const akeyless = require('akeyless');
const helpers = require('./helpers');

// IMPORTANT - Uses the GetSecretValue endpoint
// Function: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/V2Api.md#getSecretValue
// Parameters: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/GetSecretValue.md
async function getStatic(api, staticSecrets, akeylessToken, timeout) {
  console.log(`🔓[Static Secrets] Processing static secrets... '${staticSecrets}'`);

  let staticSecretsDictionary;
  try {
    staticSecretsDictionary = JSON.parse(staticSecrets);
  } catch (error) {
    helpers.generalFail(`Something went wrong during deserialization of staticSecrets input: ${error}. [IMPORTANT] Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo.`);
    return;
  }

  if (staticSecretsDictionary === undefined) {
    helpers.generalFail(`Something went wrong during deserialization of staticSecrets input. [IMPORTANT] Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo.`);
    return;
  }

  // GET STATIC SECRETS
  // Get all static secrets in a single request (the GetSecretValue endpoint supports multiple names in one call).
  const statOpts = akeyless.GetSecretValue.constructFromObject({
    token: akeylessToken,
    names: Object.keys(staticSecretsDictionary), // names: is an array of paths to fetch
    timeout: timeout
  });

  // prettier-ignore
  api.getSecretValue(statOpts).then(secretResult => {
      helpers.processStaticSecretResponse(staticSecretsDictionary, secretResult);
    })
    .catch(error => {
      SDK.setResult(SDK.TaskResult.Failed, `Could not fetch one or more static secrets. Check the secret's path Error: ${JSON.stringify(error)}.`, false);
    });
}

// IMPORTANT: Uses GetDynamicSecretValue endpoint
// Function: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/V2Api.md#getDynamicSecretValue
// Parameters: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/GetDynamicSecretValue.md
async function getDynamic(api, dynamicSecrets, akeylessToken, timeout, autogenerate) {
  console.log(`🔓 [Dynamic Secrets] Processing dynamic secrets... '${dynamicSecrets}'`);

  // Parse input
  let dynamicSecretsDictionary;
  try {
    dynamicSecretsDictionary = JSON.parse(dynamicSecrets);
  } catch (error) {
    helpers.generalFail(`Something went wrong during deserialization of dynamicSecrets input. Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`);
    return;
  }

  if (dynamicSecretsDictionary === undefined) {
    helpers.generalFail(`Something went wrong during deserialization of dynamicSecrets input. Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`);
    return;
  }

  // GET DYNAMIC SECRETS
  // GetDynamicSecretValue endpoint only supports fetching a single secret per request, so I iterate over each and fetch it.
  for (const key of Object.keys(dynamicSecretsDictionary)) {
    const akeylessPath = key;
    const outputVar = dynamicSecretsDictionary[akeylessPath];

    console.log(`Fetching '${akeylessPath}'...`);

    const dynOpts = akeyless.GetDynamicSecretValue.constructFromObject({
      token: akeylessToken,
      name: akeylessPath, // name: is a single akeyless path
      timeout: timeout,
      json: true
    });

    // prettier-ignore
    api.getDynamicSecretValue(dynOpts).then(secretResult => {
      helpers.processDynamicSecretResponse(akeylessPath, outputVar, secretResult, autogenerate);
    })
    .catch(error => {
      SDK.setResult(SDK.TaskResult.Failed, `Could not fetch '${akeylessPath}'. Error: ${JSON.stringify(error)}.`, false);
    });
  }
}

exports.getStatic = getStatic;
exports.getDynamic = getDynamic;
