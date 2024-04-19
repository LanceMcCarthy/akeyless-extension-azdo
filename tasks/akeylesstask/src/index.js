const tl = require('azure-pipelines-task-lib/task');
const auth = require('./auth');
const awsAccess = require('./aws_access');
const secrets = require('./secrets');
const input = require('./input');

// PERSONAL NOTE: API Ref to help with conversion form GH Action
// https://github.com/microsoft/azure-pipelines-task-lib/blob/master/node/docs/azure-pipelines-task-lib.md

async function run() {
  tl.debug('Fetching input');

  const {accessId, accessType, apiUrl, producerForAwsAccess, staticSecrets, dynamicSecrets} = input.fetchAndValidateInput();

  tl.debug(`access id: ${accessId}`);
  tl.debug(`Fetch akeyless token with access type ${accessType}`);

  let akeylessToken;
  try {
    const akeylessLoginResponse = await auth.akeylessLogin(accessId, accessType, apiUrl);
    akeylessToken = akeylessLoginResponse['token'];
  } catch (error) {
    tl.error(`Failed to login to AKeyless: ${error}`);
    tl.setFailed(`Failed to login to AKeyless: ${error}`);
    return;
  }

  tl.debug(`AKeyless token length: ${akeylessToken.length}`);

  // Logging into AWS and fetching secrets can all run at the same time,
  // and we don't need to do anything with the response from them.  Therefore, collect
  // their promises and then just await for all of them.
  const toAwait = [];

  // AWS Access
  if (producerForAwsAccess) {
    tl.debug(`AWS Access: Fetching credentials with producer ${producerForAwsAccess}`);
    toAwait.push(awsAccess.awsLogin(akeylessToken, producerForAwsAccess, apiUrl));
  } else {
    tl.debug(`AWS Access: Skipping because no AWS producer is specified`);
  }

  // static secrets
  if (staticSecrets) {
    tl.debug(`Static Secrets: Fetching!`);
    toAwait.push(secrets.exportStaticSecrets(akeylessToken, staticSecrets, apiUrl));
  } else {
    tl.debug(`Static Secrets: Skpping step because no static secrets were specified`);
  }

  // dynamic secrets
  if (dynamicSecrets) {
    tl.debug(`Dynamic Secrets: Fetching!`);
    toAwait.push(secrets.exportDynamicSecrets(akeylessToken, dynamicSecrets, apiUrl));
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
