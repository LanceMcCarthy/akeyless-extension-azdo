const SDK = require('azure-pipelines-task-lib/task');
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
      for (const [akeylessPath, outputValue] of Object.entries(secretResult)) {
        const outputName = staticSecretsDictionary[akeylessPath];

        if (outputValue === undefined) {
          console.log(`⚠️ [Warning] '${akeylessPath}' has no value, please verify the secret is properly configured in akeyless.`);
          continue;
        }
      
        SDK.setVariable(outputName, outputValue, true, true);
        console.log(`✅ '${akeylessPath}' => output: ${outputName}, value: ${outputValue}`);
      }
    })
    .catch(error => {
      SDK.setResult(SDK.TaskResult.Failed, `Could not fetch one or more static secrets. Check the secret's path Error: ${JSON.stringify(error)}.`, false);
    });
}

// IMPORTANT: Uses GetDynamicSecretValue endpoint
// Parameters: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/V2Api.md#getDynamicSecretValue
// Function: https://github.com/akeylesslabs/akeyless-javascript/blob/master/docs/GetDynamicSecretValue.md
async function getDynamic(api, dynamicSecrets, akeylessToken, timeout) {
  console.log(`🔓 [Dynamic Secrets] Processing dynamic secrets... '${dynamicSecrets}'`);

  // Parse input
  let dynamicSecretsDictionary = JSON.parse(dynamicSecrets);

  if (dynamicSecretsDictionary === undefined) {
    helpers.generalFail(`Something went wrong during deserialization of dynamicSecrets input. Check the JSON string is in the format of a dictionary, see docs for examples https://github.com/LanceMcCarthy/akeyless-extension-azdo`);
  }

  // GET DYNAMIC SECRETS
  // GetDynamicSecretValue endpoint only supports fetching a single secret per request, so I iterate over each and fetch it.
  for (const key of Object.keys(dynamicSecretsDictionary)) {
    const akeylessPath = key;
    const outputVar = dynamicSecretsDictionary[akeylessPath];

    console.log(` - Fetching '${akeylessPath}'...`);

    const dynOpts = akeyless.GetDynamicSecretValue.constructFromObject({
      token: akeylessToken,
      name: akeylessPath, // name: is a single akeyless path
      timeout: timeout,
      json: true
    });

    // prettier-ignore
    api.getDynamicSecretValue(dynOpts).then(secretResult => {
      try {
        //console.log(`Successful API fetch, processing result...`);
        console.log(`Pre-processing check: '${JSON.stringify(secretResult)}'`);

        // remove escaped quotes from the stringified JSON to prevent double-escaping issues in PowerShell
        secretResult = JSON.stringify(secretResult).replace(/\\"/g, "'")

        // TEMPORARY - OBJECT BREAKOUT
        // this outputs each object property as its own variable, then the full object as a JSON string.
        //breakoutProcessing(akeylessPath, secretResult);

        // Now that the entire secretResult is processed, stringify it for final response.
        // secretResult = JSON.stringify(secretResult);
        
        // // Escape characters that can break PowerShell execution
        // // Replace problematic characters to make it PowerShell-safe
        // secretResult = helpers.escape(safeSecretResult);

        console.log(`Post-processing check: '${secretResult}'`);

        SDK.setVariable(outputVar, secretResult, true, true);
        console.log(`✅ '${akeylessPath}' => output var: ${outputVar}, value: ${secretResult}`);
      } catch (e) {
        helpers.generalFail(`Processing the dynamic secret response failed. Error: ${e}`);
      }
    })
    .catch(error => {
      SDK.setResult(SDK.TaskResult.Failed, `Could not fetch '${akeylessPath}'. Error: ${JSON.stringify(error)}.`, false);
    });
  }
}

// function breakoutProcessing(akeylessPath, secretResult) {
//   // If the key's value is another object, breakout each property as its own output variable.
//   for (const [key, value] of Object.entries(secretResult)) {
//     let variableName = `${akeylessPath}_${key}`;
//     let variableValue = value;

//     // If the key's value is a nested object, convert it to a JSON string for safe storage as an output variable
//     if (typeof value === 'object' && value !== null) {
//       for (const [subkey, subvalue] of Object.entries(secretResult)) {
//         variableName = `${akeylessPath}_${key}_${subkey}`;
//         variableValue = JSON.stringify(subvalue);

//         SDK.setVariable(variableName, variableValue, true, true);
//         console.log(`✅ ${variableName}, value: ${variableValue}`);
//       }

//       continue;
//     }

//     if (typeof variableValue === 'string' && !isNaN(value)) {
//       // Now that we know the value is not null, is a string, and is not a single number, we can try to parse it as JSON to see if it needs conversion.
//       try {
//         // Try to parse the string as JSON
//         const parsedValue = JSON.parse(variableValue);
//         variableValue = helpers.escape(parsedValue);
//         console.log(`'${key}' was a JSON value, parsed to object for safer downstream processing.`);
//       } catch {
//         // If it could not parse, it was just a regular string, so we leave it as-is.
//         console.log(`Value for key '${key}' is fine, moving on.`);
//       }
//     }

//     SDK.setVariable(variableName, variableValue, true, true);
//     console.log(`✅ ${variableName}, value: ${variableValue}`);
//   }
// }

exports.getStatic = getStatic;
exports.getDynamic = getDynamic;
