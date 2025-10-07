const SDK = require('azure-pipelines-task-lib/task');

// function success(outputName, value, akeylessPath) {
//   if (value === undefined) {
//     console.log(`⚠️ [Warning] '${akeylessPath}' has no value, please verify the secret is properly configured in akeyless.`);
//   }

//   SDK.setVariable(outputName, value, true, true);
//   console.log(`✅ output var: ${outputName}, value: ${value}`);

//   // SDK.setVariable(outputName, value, true, true);
//   // console.log(`✅ Success! '${akeylessPath}' is set to the '${outputName}' output variable.`);
// }

// function fetchFail(akeylessPath, errorText) {
//   SDK.setResult(SDK.TaskResult.Failed, `Could not fetch '${akeylessPath}'. Error: ${errorText}.`, false);
// }

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

// exports.success = success;
// exports.fetchFail = fetchFail;
exports.generalFail = generalFail;
exports.escape = escape;
