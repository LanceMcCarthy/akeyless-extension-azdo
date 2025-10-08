const SDK = require('azure-pipelines-task-lib/task');

function processStaticSecretResponse(secretResult) {
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
}

function processDynamicSecretResponse(akeylessPath, outputVar, secretResult) {
  try {
    console.log(`Successful API fetch, processing result...`);
    //console.log(`Pre-processing check: '${JSON.stringify(secretResult)}'`);

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
    console.log(`✅ '${akeylessPath}' (complete response) => main output var: ${outputVar}`);
  } catch (e) {
    helpers.generalFail(`Processing the dynamic secret response failed. Error: ${e}`);
  }
}

function generalFail(message) {
  SDK.setResult(SDK.TaskResult.Failed, message, true);
}

function escape(item) {
  return item
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/'/g, "''") // Escape single quotes for PowerShell
    .replace(/"/g, '""') // Escape double quotes for PowerShell
    .replace(/`/g, '``') // Escape backticks for PowerShell
    .replace(/\$/g, '`$') // Escape dollar signs for PowerShell
    .replace(/\r?\n/g, '`n'); // Replace newlines with PowerShell escape sequence
}

exports.processStaticSecretResponse = processStaticSecretResponse;
exports.processDynamicSecretResponse = processDynamicSecretResponse;
exports.generalFail = generalFail;
exports.escape = escape;
