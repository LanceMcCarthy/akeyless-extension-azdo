const akeyless = require('akeyless');
const helpers = require('./helpers');

//Akeyless SDK documentation https://github.com/akeylesslabs/akeyless-javascript

async function getAkeylessToken(api, accessId, azureJwt) {
  console.log(`Requesting access token from akeyless...`);

  let akeylessToken = undefined;

  try {
    const opts = {'access-type': 'jwt', 'access-id': accessId, jwt: azureJwt};
    const body = akeyless.Auth.constructFromObject(opts);

    // get the akeyless token
    const data = await api.auth(body);
    akeylessToken = data.token;

    console.log('👍 Received authentication token from akeyless!');
  } catch (error) {
    helpers.generalFail(`Failed to authenticate with Akeyless, please verify you have set up your Auth Method and/or Access Role properly. \r\nError: ${error}.`);
  }

  if (akeylessToken === undefined) {
    helpers.generalFail(`Unexpected failure. The akeyless token is empty even though you're authenticated, please double check the inputs or open an issue at https://github.com/LanceMcCarthy/akeyless-extension-azdo.`);
  }

  return akeylessToken;
}

exports.getAkeylessToken = getAkeylessToken;
