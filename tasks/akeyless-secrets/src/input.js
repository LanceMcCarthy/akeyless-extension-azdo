const SDK = require('azure-pipelines-task-lib/task');

const readInputs = () => {
  const params = {
    accessId: SDK.getInput('accessId', true),
    azureJwt: SDK.getInput('azureJwt', true),
    apiUrl: SDK.getInput('apiUrl'),
    staticSecrets: SDK.getInput('staticSecrets'),
    dynamicSecrets: SDK.getInput('dynamicSecrets'),
    requestTimeout: SDK.getInput('timeout')
  };
  return params;
};

exports.readInputs = readInputs;
