const akeyless = require('akeyless');
const helpers = require('./helpers');

// IMPORTANT - Uses the GetSecretValue endpoint
// Function: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/GetSecretValue.md
// Parameters: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/V2Api.md#getSecretValue
async function getStatic(api, staticSecrets, akeylessToken, timeout) {
  console.log(`🔓[Static Secrets] Processing static secrets... '${staticSecrets}'`);

  const staticSecretsDictionary = JSON.parse(staticSecrets);

  if (staticSecretsDictionary === undefined) {
    helpers.generalFail(`Something went wrong during deserialization of staticSecrets input. Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`);
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
async function getDynamic(api, dynamicSecrets, akeylessToken, timeout) {
  console.log(`🔓 [Dynamic Secrets] Processing dynamic secrets... '${dynamicSecrets}'`);

  // Parse input
  let dynamicSecretsDictionary = JSON.parse(dynamicSecrets);

  if (dynamicSecretsDictionary === undefined) {
    helpers.generalFail(`Something went wrong during deserialization of dynamicSecrets input. Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`);
  }

  console.log(`⚒️ dynamicSecretsDictionary: '${dynamicSecretsDictionary}' fetch:`);

  // GET DYNAMIC SECRETS
  // GetDynamicSecretValue endpoint only supports fetching a single secret per request, so I iterate over each and fetch it.
  for (const key of Object.keys(dynamicSecretsDictionary)) {
    console.log(`⚒️ [Debug] '${key}' loop:`);

    const akeylessPath = key;
    console.log(`⚒️⚒️ akeylessPath: '${akeylessPath}'`);

    const outputVar = dynamicSecretsDictionary[akeylessPath];
    console.log(`⚒️⚒️ outputVar: '${outputVar}'`);

    // Let the user know we are attempting to get (this helps significantly when troubleshooting a problem).
    // console.log(`Fetching '${akeylessPath}' from akeyless for use in '${outputVar}'...`);

    const dynOpts = akeyless.GetDynamicSecretValue.constructFromObject({
      token: akeylessToken,
      name: akeylessPath, // name: is a single akeyless path
      timeout: timeout
    });

    console.log(`⚒️⚒️ dynOpts: '${dynOpts}'`);

    // prettier-ignore
    api.getDynamicSecretValue(dynOpts).then(secretResult => {
      console.log(`⚒️⚒️ secretResult: '${secretResult}'`);
        
        // getDynamicSecretValue => secretResult: a single secret value. Pass the entire secretResult object as the secret value
        helpers.success(outputVar, secretResult, akeylessPath);
      })
      .catch(error => {
        helpers.fetchFail(akeylessPath, JSON.stringify(error));
      });
  }
}

exports.getStatic = getStatic;
exports.getDynamic = getDynamic;
