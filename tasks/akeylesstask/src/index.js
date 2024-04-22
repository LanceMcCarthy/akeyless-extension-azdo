const tl = require('azure-pipelines-task-lib/task');
const auth = require('./auth');
const secrets = require('./secrets');
const input = require('./input');

// Azure AzDO Extensions SDK reference
// https://github.com/microsoft/azure-pipelines-task-lib/blob/master/node/docs/azure-pipelines-task-lib.md

async function run() {
  tl.debug('Fetching input');

  const {accessId, azureJwt, staticSecrets, dynamicSecrets, exportSecretsToOutputs, exportSecretsToEnvironment, parseDynamicSecrets} = input.fetchAndValidateInput();

  tl.debug(`access id: ${accessId}`);

  let akeylessToken = undefined;
  const apiUrl = 'https://api.akeyless.io';

  try {
    const akeylessLoginResponse = await auth.akeylessLogin(accessId, azureJwt, apiUrl);
    akeylessToken = akeylessLoginResponse['token'];
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
    tl.debug(`Static Secrets: Fetching!`);
    toAwait.push(secrets.exportStaticSecrets(akeylessToken, staticSecrets, apiUrl, exportSecretsToEnvironment, exportSecretsToOutputs));
  } else {
    tl.debug(`Static Secrets: Skpping step because no static secrets were specified`);
  }

  // dynamic secrets
  if (dynamicSecrets) {
    tl.debug(`Dynamic Secrets: Fetching!`);
    toAwait.push(secrets.exportDynamicSecrets(akeylessToken, dynamicSecrets, apiUrl, exportSecretsToEnvironment, exportSecretsToOutputs));
  } else {
    tl.debug(`Dynamic Secrets: Skipping step because no dynamic secrets were specified`);
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
