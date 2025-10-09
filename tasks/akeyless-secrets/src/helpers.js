const SDK = require('azure-pipelines-task-lib/task');

function processStaticSecretResponse(staticSecretsDictionary, secretResult) {
  // getSecretValue => secretResult: is a dictionary of key/value pairs of akeyless-path:secret-value. iterate over the returned dictionary of all static secrets
  for (const [akeylessPath, secret] of Object.entries(secretResult)) {
    const outputName = staticSecretsDictionary[akeylessPath];

    if (secret === undefined) {
      console.log(`⚠️ [Warning] '${akeylessPath}' has no value, please verify the secret is properly configured in akeyless.`);
      continue;
    }

    SDK.setVariable(outputName, secret, true, true);
    console.log(`✅ '${akeylessPath}' => output: ${outputName}, value: ${secret}`);
  }
}

function processDynamicSecretResponse(akeylessPath, outputVar, secretResult, autogenerate) {
  try {
    console.log(`Successfully fetched '${akeylessPath}', processing result...`);

    // Recursive function to flatten nested objects into individual AzDO output variables
    function processNestedObject(obj, parentKey = '') {
      for (const [key, value] of Object.entries(obj)) {
        let variableName = parentKey ? `${parentKey}_${key}` : key;

        // put the requested output var name as the main prefix. This avoids key conflicts in if multiple secrets have the same key names
        variableName = `${outputVar}_${variableName}`;

        if (value === null || value === undefined) {
          // Handle null/undefined values
          SDK.setVariable(variableName, '', true, true);
          console.log(`✅ Output: ${variableName} => (⚠️ empty ⚠️ This was null/undefined.)`);
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
              console.log(`✅ Output: ${variableName} => ${parsedJson} (parsed JSON primitive)`);
            }
          } catch {
            // Not JSON, treat as regular string
            SDK.setVariable(variableName, value, true, true);
            console.log(`✅ Output: ${variableName} => ${value}`);
          }
        } else if (typeof value === 'object' && value !== null) {
          // Nested object - recurse into it
          console.log(`🔄 ${variableName} is nested object, processing recursively...`);
          processNestedObject(value, variableName);
        } else {
          // Primitive value (number, boolean, etc.)
          SDK.setVariable(variableName, String(value), true, true);
          console.log(`✅ Output: ${variableName} => ${value}`);
        }
      }
    }

    // PART 1 - Process the secretResult object recursively
    if (autogenerate === 'true' || autogenerate === true) {
      console.log(`🛠️ Autogenerate enabled, creating separate outputs...`);
      processNestedObject(secretResult);
    }

    // PART 2 - For backwards compatibility, also set the complete object as the main output variable (as JSON string)
    const fullSecretJson = JSON.stringify(secretResult);
    SDK.setVariable(outputVar, fullSecretJson, true, true);
    console.log(`✅ Output: ${outputVar} (complete response) => '${akeylessPath}'`);
  } catch (e) {
    helpers.generalFail(`Processing the dynamic secret response failed. Error: ${e}`);
  }
}

function generalFail(message) {
  SDK.setResult(SDK.TaskResult.Failed, `❌ ${message}`, true);
}

exports.processStaticSecretResponse = processStaticSecretResponse;
exports.processDynamicSecretResponse = processDynamicSecretResponse;
exports.generalFail = generalFail;
