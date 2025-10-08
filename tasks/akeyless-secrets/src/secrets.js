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


        console.log(`Successful API fetch, processing result...`);
        console.log(`Pre-processing check: '${JSON.stringify(secretResult)}'`);

        // Recursive function to flatten nested objects into individual AzDO output variables
        function processNestedObject(obj, parentKey = '') {
          for (const [key, value] of Object.entries(obj)) {
            const variableName = parentKey ? `${parentKey}_${key}` : key;
            
            if (value === null || value === undefined) {
              // Handle null/undefined values
              SDK.setVariable(variableName, '', true, true);
              console.log(`✅ ${variableName} => (empty - was null/undefined)`);
            } else if (typeof value === 'string') {
              // Check if string is JSON
              try {
                const parsedJson = JSON.parse(value);
                if (typeof parsedJson === 'object' && parsedJson !== null) {
                  // String contains JSON object - recursively process it
                  console.log(`🔄 ${variableName} contains JSON object, processing recursively...`);
                  processNestedObject(parsedJson, variableName);
                } else {
                  // String contains JSON primitive - set as string value
                  SDK.setVariable(variableName, String(parsedJson), true, true);
                  console.log(`✅ ${variableName} => ${parsedJson} (parsed JSON primitive)`);
                }
              } catch {
                // Not JSON, treat as regular string
                SDK.setVariable(variableName, value, true, true);
                console.log(`✅ ${variableName} => ${value}`);
              }
            } else if (typeof value === 'object' && value !== null) {
              // Nested object - recurse into it
              console.log(`🔄 ${variableName} is nested object, processing recursively...`);
              processNestedObject(value, variableName);
            } else {
              // Primitive value (number, boolean, etc.)
              SDK.setVariable(variableName, String(value), true, true);
              console.log(`✅ ${variableName} => ${value}`);
            }
          }
        }

        // Process the secretResult object recursively
        processNestedObject(secretResult);

        // Also set the complete object as the main output variable (as JSON string)
        const fullSecretJson = JSON.stringify(secretResult);
        SDK.setVariable(outputVar, fullSecretJson, true, true);
        console.log(`✅ '${akeylessPath}' => main output var: ${outputVar} (complete JSON)`);
      } catch (e) {
        helpers.generalFail(`Processing the dynamic secret response failed. Error: ${e}`);
      }
    })
    .catch(error => {
      SDK.setResult(SDK.TaskResult.Failed, `Could not fetch '${akeylessPath}'. Error: ${JSON.stringify(error)}.`, false);
    });
  }
}

// function separateOutputsProcessing(akeylessPath, secretResult) {
//   console.log(` - Processing separate outputs for '${akeylessPath}'...`);

//   // If the secretResult is not an object, just return it as a single output variable.
//   if (typeof secretResult !== 'object' || secretResult === null) {
//     const outputVar = `${akeylessPath}`;
//     SDK.setVariable(outputVar, secretResult, true, true);
//     console.log(`✅ ${outputVar}, value: ${secretResult}`);
//     return;
//   }

//   // If the secretResult is an array, convert it to a JSON string for safe storage as an output variable
//   if (Array.isArray(secretResult)) {
//     const outputVar = `${akeylessPath}`;
//     const variableValue = JSON.stringify(secretResult);
//     SDK.setVariable(outputVar, variableValue, true, true);
//     console.log(`✅ ${outputVar}, value: ${variableValue}`);
//     return;
//   }

//   // At this point, we know the secretResult is a non-null object (not an array).
//   // Iterate over each key/value pair in the object.
//   // For each key/value pair, create an output variable named {akeylessPath}_{key} with the corresponding value.

//   // If the key's value is another object, breakout each property as its own output variable.
//   for (const [key, value] of Object.entries(secretResult)) {
//     let outputVar = `${akeylessPath}_${key}`;
//     let variableValue = value;

//     // If the key's value is a nested object, convert it to a JSON string for safe storage as an output variable
//     if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
//       for (const [subkey, subvalue] of Object.entries(secretResult)) {
//         outputVar = `${akeylessPath}_${key}_${subkey}`;
//         variableValue = JSON.stringify(subvalue);

//         SDK.setVariable(outputVar, variableValue, true, true);
//         console.log(`✅ ${outputVar}, value: ${variableValue}`);
//       }

//       continue;
//     }

//     // if (typeof variableValue === 'string' && !isNaN(value)) {
//     //   // Now that we know the value is not null, is a string, and is not a single number, we can try to parse it as JSON to see if it needs conversion.
//     //   try {
//     //     // Try to parse the string as JSON
//     //     const parsedValue = JSON.parse(variableValue);
//     //     variableValue = helpers.escape(parsedValue);
//     //     console.log(`'${key}' was a JSON value, parsed to object for safer downstream processing.`);
//     //   } catch {
//     //     // If it could not parse, it was just a regular string, so we leave it as-is.
//     //     console.log(`Value for key '${key}' is fine, moving on.`);
//     //   }
//     // }

//     SDK.setVariable(outputVar, variableValue, true, true);
//     console.log(`✅ '${akeylessPath}' => output var: ${outputVar}, value: ${variableValue}`);
//     //console.log(`✅ '${akeylessPath}' => output var: ${outputVar}`);
//   }
//}

exports.getStatic = getStatic;
exports.getDynamic = getDynamic;
