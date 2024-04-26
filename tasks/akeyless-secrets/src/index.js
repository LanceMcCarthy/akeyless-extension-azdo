const SDK = require('azure-pipelines-task-lib/task');
const auth = require('./auth');
const secrets = require('./secrets');

async function run() {
  // Phase 1 - Get inputs and validate
  const accessId = SDK.getInput('accessId', true);
  const azureJwt = SDK.getInput('azureJwt', true);
  const staticSecrets = SDK.getInput('staticSecrets');
  const dynamicSecrets = SDK.getInput('dynamicSecrets');

  console.log(`Validating inputs...`);

  if (accessId === undefined) {
    throw new Error('You must provide the access id for your auth method via the accessId input');
  }

  if (azureJwt === undefined) {
    throw new Error('You must provide a JWT token for Azure authentication, this is generated by a Service connection and Azure CLI.');
  }

  // Phase 2 - Get akeyless authentication

  let akeylessToken = undefined;
  const apiUrl = 'https://api.akeyless.io';

  try {
    console.log(`Authenticating with akeyless...`);

    const akeylessLoginResponse = await auth.akeylessLogin(accessId, azureJwt, apiUrl);

    akeylessToken = akeylessLoginResponse['token'];

    console.log(`Granted an akeyless token!`);
  } catch (error) {
    SDK.setResult(SDK.TaskResult.Failed, `Failed to authenticate with Akeyless, please verify you have set up your Auth Method and/or Access Role properly. \r\nError: ${error}.`);
    return;
  }

  if (akeylessToken === undefined) {
    SDK.setResult(
      SDK.TaskResult.Failed,
      `AKeyless token is empty, cannot continue. If you are successfully authenticating, but are not getting a token from akeyless, please open an issue here https://github.com/LanceMcCarthy/akeyless-extension-azdo.`
    );
  }

  // Phase 3 - Fetch akeyless secrets

  // static secrets
  if (staticSecrets) {
    console.log(`[Static Secrets] Fetching static secrets...`);

    toAwait.push(secrets.exportStaticSecrets(akeylessToken, staticSecrets, apiUrl));
  } else {
    console.log(`[Static Secrets] Skipping static secrets step because no static secrets were requested.`);
  }

  // dynamic secrets
  if (dynamicSecrets) {
    console.log(`[Dynamic Secrets] Fetching dynamic secrets...`);

    toAwait.push(secrets.exportDynamicSecrets(akeylessToken, dynamicSecrets, apiUrl));
  } else {
    console.log(`[Dynamic Secrets] Skipping dynamic secrets step because no dynamic secrets were requested.`);
  }
}

exports.run = run;

if (require.main === module) {
  try {
    SDK.debug('Starting main run');
    run();
  } catch (e) {
    SDK.debug(e.stack);
    SDK.error(e.message);
    SDK.setResult(SDK.TaskResult.Failed, e.message);
  }
}
