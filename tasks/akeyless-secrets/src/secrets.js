const akeyless = require('akeyless');
const helpers = require('./helpers');

// IMPORTANT - Uses the GetSecretValue endpoint
// Function: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/GetSecretValue.md
// Parameters: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/V2Api.md#getSecretValue
async function processStaticSecrets(api, staticSecrets, akeylessToken, timeout) {
  console.log(`🔓[Static Secrets] Processing static secrets... '${staticSecrets}'`);

  const staticSecretsDictionary = JSON.parse(staticSecrets);

  if (staticSecretsDictionary === undefined) {
    helpers.generalFail(`Something went wrong during deserialization of staticSecrets input. Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`);
  }

  const statOpts = akeyless.GetSecretValue.constructFromObject({
    token: akeylessToken,
    names: Object.keys(staticSecretsDictionary), // names: is an array of paths to fetch
    timeout: timeout
  });

  // prettier-ignore
  api.getSecretValue(statOpts).then(secretResult => {
      // getSecretValue => secretResult: is a dictionary of key/value pairs of akeyless-path:secret-value. iterate over the returned dictionary of all static secrets
      for (const [akeylessPath, secretValue] of Object.entries(secretResult)) {
        helpers.success(staticSecretsDictionary[akeylessPath], secretValue, akeylessPath);
      }
    })
    .catch(error => {
      helpers.fetchFail(akeylessPath, JSON.stringify(error));
    });
}

// IMPORTANT: Uses GetDynamicSecretValue endpoint
// Function: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/GetDynamicSecretValue.md
// Parameters: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/V2Api.md#getDynamicSecretValue
async function processDynamicSecrets(api, dynamicSecrets, akeylessToken, timeout) {
  console.log(`🔓 [Dynamic Secrets] Processing dynamic secrets... '${dynamicSecrets}'`);

  // Parse input
  let dynamicSecretsDictionary = JSON.parse(dynamicSecrets);

  if (dynamicSecretsDictionary === undefined) {
    helpers.generalFail(`Something went wrong during deserialization of dynamicSecrets input. Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`);
  }

  // GET DYNAMIC SECRETS
  // Iterate over the dictionary and get each dynamic secret. The keys are the akeyless paths, the values are the desired output variable names
  for (const key of Object.keys(dynamicSecretsDictionary)) {
    const akeylessPath = key;
    const outputVar = dynamicSecretsDictionary[akeylessPath];

    // Let the user know we are attempting to get (this helps significantly when troubleshooting a problem).
    console.log(`Fetching '${akeylessPath}' from akeyless for use in '${outputVar}'...`);

    const dynOpts = akeyless.GetDynamicSecretValue.constructFromObject({
      token: akeylessToken,
      name: akeylessPath, // name: is a single akeyless path
      timeout: timeout
    });

    // prettier-ignore
    api.getDynamicSecretValue(dynOpts).then(secretResult => {
        // getDynamicSecretValue => secretResult: a single secret value. Pass the entire secretResult object as the secret value
        helpers.success(outputVar, secretResult, akeylessPath);
      })
      .catch(error => {
        helpers.fetchFail(akeylessPath, JSON.stringify(error));
      });
  }
}

exports.processStaticSecrets = processStaticSecrets;
exports.processDynamiccSecrets = processDynamicSecrets;
