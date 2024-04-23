const tl = require('azure-pipelines-task-lib/task');
const auth = require('./auth');
const secrets = require('./secrets');
const input = require('./input');

// Azure AzDO Extensions SDK reference
// https://github.com/microsoft/azure-pipelines-task-lib/blob/master/node/docs/azure-pipelines-task-lib.md

async function run() {
  let akeylessToken = undefined;
  const apiUrl = 'https://api.akeyless.io';
  const taskId = tl.getVariable('taskGuid');

  tl.logDetail((id = taskId), (message = `Gathering inputs...`), (state = tl.TaskState.InProgress));

  const {accessId, azureJwt, staticSecrets, dynamicSecrets, exportSecretsToOutputs, exportSecretsToEnvironment, parseDynamicSecrets} = input.fetchAndValidateInput();

  try {
    tl.logDetail((id = taskId), (message = `Authenticating aith akeyless...`), (state = tl.TaskState.InProgress));

    const akeylessLoginResponse = await auth.akeylessLogin(accessId, azureJwt, apiUrl);

    akeylessToken = akeylessLoginResponse['token'];

    tl.logDetail((id = taskId), (message = `Got an akeyless token: ${akeylessToken}`), (state = tl.TaskState.InProgress));
  } catch (error) {
    tl.setResult(tl.TaskResult.Failed, `Failed to login to AKeyless: ${error}`);
    return;
  }

  if (akeylessToken === undefined) {
    tl.setResult(tl.TaskResult.Failed, `AKeyless token is empty, cannot continue.`);
  }

  tl.debug(`AKeyless token length: ${akeylessToken.length}`);

  const toAwait = [];

  // static secrets
  if (staticSecrets) {
    tl.logDetail((id = taskId), (message = `Fetching static secrets...`), (state = tl.TaskState.InProgress));

    toAwait.push(secrets.exportStaticSecrets(akeylessToken, staticSecrets, apiUrl, exportSecretsToEnvironment, exportSecretsToOutputs));
  } else {
    tl.logDetail((id = taskId), (message = `Skipping static secrets step because no static secrets were requested.`), (state = tl.TaskState.InProgress));
  }

  // dynamic secrets
  if (dynamicSecrets) {
    tl.logDetail((id = taskId), (message = `Fetching dynamic secrets...`), (state = tl.TaskState.InProgress));
    toAwait.push(secrets.exportDynamicSecrets(akeylessToken, dynamicSecrets, apiUrl, exportSecretsToEnvironment, exportSecretsToOutputs));
  } else {
    tl.logDetail((id = taskId), (message = `Skipping dynamic secrets step because no dynamic secrets were requested.`), (state = tl.TaskState.InProgress));
  }
}

exports.run = run;

if (require.main === module) {
  try {
    tl.debug('Starting main run');
    run();
  } catch (e) {
    tl.debug(e.stack);
    tl.error(e.message);
    tl.setResult(tl.TaskResult.Failed, e.message);
  }
}
