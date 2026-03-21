const SDK = require('azure-pipelines-task-lib/task');
const os = require('os');

function setSecretOutputVariable(variableName, variableValue, isOutput = true) {
  const value = variableValue === undefined || variableValue === null ? '' : String(variableValue);
  const includesNewline = /\r|\n/.test(value);
  const shouldEncodeForPlatformCompatibility = includesNewline && os.platform() !== 'win32';
  const outputValue = shouldEncodeForPlatformCompatibility ? Buffer.from(value, 'utf8').toString('base64') : value;
  const envKeys = ['SYSTEM_UNSAFEALLOWMULTILINESECRET', 'SYSTEM_UNSAFE_ALLOW_MULTILINE_SECRET'];
  const isMultilineAlreadyAllowed = envKeys.some(key => `${process.env[key]}`.toUpperCase() === 'TRUE');
  const shouldTemporarilyAllowMultiline = includesNewline && !shouldEncodeForPlatformCompatibility && !isMultilineAlreadyAllowed;
  const previousEnvValues = Object.fromEntries(
    envKeys.map(key => [
      key,
      {
        hadValue: Object.prototype.hasOwnProperty.call(process.env, key),
        value: process.env[key]
      }
    ])
  );

  try {
    if (shouldTemporarilyAllowMultiline) {
      // Scope multiline-secret allowance to this variable set only.
      for (const key of envKeys) {
        process.env[key] = 'TRUE';
      }
    }

    SDK.setVariable(variableName, outputValue, true, isOutput);

    if (shouldEncodeForPlatformCompatibility) {
      SDK.setVariable(`${variableName}_ENCODING`, 'base64', false, isOutput);
    }
  } finally {
    if (shouldTemporarilyAllowMultiline) {
      for (const key of envKeys) {
        const previous = previousEnvValues[key];
        if (previous.hadValue) {
          process.env[key] = previous.value;
        } else {
          delete process.env[key];
        }
      }
    }
  }

  return {
    wasEncoded: shouldEncodeForPlatformCompatibility
  };
}

function processStaticSecretResponse(staticSecretsDictionary, secretResult) {
  // getSecretValue => secretResult: is a dictionary of key/value pairs of akeyless-path:secret-value. iterate over the returned dictionary of all static secrets
  for (const [akeylessPath, secret] of Object.entries(secretResult)) {
    const outputName = staticSecretsDictionary[akeylessPath];

    if (secret === undefined) {
      console.log(`⚠️ [Warning] '${akeylessPath}' has no value, please verify the secret is properly configured in akeyless.`);
      continue;
    }

    const {wasEncoded} = setSecretOutputVariable(outputName, secret, true);
    const messageSuffix = wasEncoded ? ` (multiline secret stored as base64; see ${outputName}_ENCODING)` : ' (secret value redacted)';
    console.log(`✅ '${akeylessPath}' => output: ${outputName}${messageSuffix}`);
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
    setSecretOutputVariable(outputPrefix, fullSecretJson, true);
    console.log(`✅ Output: ${outputPrefix} (complete response) => '${akeylessPath}'`);
  } catch (e) {
    generalFail(`Processing the dynamic secret response failed. Error: ${e}`);
  }
}

function setAutoGenOutput(prefix, propName, value, extraLogMessage) {
  // Use the developer's output name as the top prefix, this avoids overwrites if multiple secrets have the same keys.
  const variableName = `${prefix}_${propName}`;
  const {wasEncoded} = setSecretOutputVariable(variableName, value);
  const details = extraLogMessage ? ` ${extraLogMessage}` : '';
  const messageSuffix = wasEncoded ? ` (multiline secret stored as base64; see ${variableName}_ENCODING).` : ' (secret value redacted).';
  console.log(`✅ Output: ${variableName}${messageSuffix}${details}`);
}

function generalFail(message) {
  SDK.setResult(SDK.TaskResult.Failed, `❌ ${message}`, true);
}

exports.processStaticSecretResponse = processStaticSecretResponse;
exports.processDynamicSecretResponse = processDynamicSecretResponse;
exports.generalFail = generalFail;
