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

function processDynamicSecretResponse(akeylessPath, outputPrefix, secretResult, autogenerate) {
  try {
    console.log(`Successfully fetched '${akeylessPath}', processing result...`);

    // Recursive function to flatten nested objects into individual AzDO output variables
    function processNestedObject(obj, parentKey = '') {
      for (const [key, value] of Object.entries(obj)) {
        const variableName = parentKey ? `${parentKey}_${key}` : key;

        if (value === null || value === undefined) {
          // Handle null/undefined values
          setAutoGenOutput(outputPrefix, variableName, '', '(⚠️ empty ⚠️ This was null/undefined.)');
        } else if (typeof value === 'string') {
          // Check if string is JSON
          try {
            const parsedJson = JSON.parse(value);
            if (typeof parsedJson === 'object' && parsedJson !== null) {
              // String contains JSON object - recursively process it
              console.log(`🔄 ${variableName} contains JSON object, processing recursively...`);
              processNestedObject(parsedJson, variableName);
            } else {
              // otherwise it's a primitive (string, number, boolean)
              setAutoGenOutput(outputPrefix, variableName, String(parsedJson), '(parsed JSON primitive)');
            }
          } catch {
            // Not JSON, just a regular string
            setAutoGenOutput(outputPrefix, variableName, value, '');
          }
        } else if (typeof value === 'object' && value !== null) {
          // Nested object - recurse into it
          console.log(`🔄 ${variableName} is nested object, processing recursively...`);
          processNestedObject(value, variableName);
        } else {
          setAutoGenOutput(outputPrefix, variableName, String(value), '');
        }
      }
    }

    // PART 1 - Process the secretResult object recursively
    if (autogenerate === 'true' || autogenerate === true) {
      console.log(`🛠️ Autogenerate enabled, creating separate outputs...`);
      processNestedObject(secretResult);
    }

    // PART 2 - For backwards compatibility, I still set complete object as the main output variable (as JSON string)
    const fullSecretJson = JSON.stringify(secretResult);
    SDK.setVariable(outputPrefix, fullSecretJson, true, true);
    console.log(`✅ Output: ${outputPrefix} (complete response) => '${akeylessPath}'`);
  } catch (e) {
    generalFail(`Processing the dynamic secret response failed. Error: ${e}`);
  }
}

function setAutoGenOutput(prefix, propName, value, extraLogMessage) {
  // Use the developer's output name as the top prefix, this avoids overwrites if multiple secrets have the same keys.
  const variableName = `${prefix}_${propName}`;
  SDK.setVariable(variableName, value, true, true);
  console.log(`✅ Output: ${variableName} => ${value}. ${extraLogMessage || ''}`);
}

function generalFail(message) {
  SDK.setResult(SDK.TaskResult.Failed, `❌ ${message}`, true);
}

exports.processStaticSecretResponse = processStaticSecretResponse;
exports.processDynamicSecretResponse = processDynamicSecretResponse;
exports.generalFail = generalFail;
