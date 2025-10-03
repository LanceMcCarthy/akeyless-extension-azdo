const SDK = require('azure-pipelines-task-lib/task');
const akeyless = require('akeyless');
const helpers = require('./helpers');
const auth = require('./auth');
const secrets = require('./secrets');
const input = require('./input');

async function run() {
  // **** Phase 1 - Get inputs and validate ******** //

  const {accessId, azureJwt, apiUrl, staticSecrets, dynamicSecrets, requestTimeout} = input.readInputs();

  const client = new akeyless.ApiClient();
  client.basePath = apiUrl;
  const api = new akeyless.V2Api(client);

  console.log(`🔔 Important Reminder: To reference a task's outputs, the task needs a 'name' (or a 'Reference Name' for classic pipelines). See this real-world example https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/examples.md#conclusion--real-world-example.`);

  // **** Phase 2 - Get akeyless authentication **** //

  let akeylessToken = await auth.getAkeylessToken(api, accessId, azureJwt);

  if (akeylessToken === undefined) {
    helpers.generalFail(`Unexpected failure. The akeyless token is empty even though you're authenticated, please double check the inputs or open an issue at https://github.com/LanceMcCarthy/akeyless-extension-azdo.`);
  }

  // ***** Phase 3 - Fetch akeyless secrets ******** //

  if (staticSecrets) {
    await secrets.getStatic(api, staticSecrets, akeylessToken, requestTimeout);
  } else {
    console.log(`ℹ️ [Static Secrets] Skipped, staticSecrets paths were not provided.`);
  }

  if (dynamicSecrets) {
    await secrets.getDynamic(api, dynamicSecrets, akeylessToken, requestTimeout);
  } else {
    console.log(`ℹ️ [Dynamic Secrets] Skipped, dynamicSecrets paths were not provided.`);
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
