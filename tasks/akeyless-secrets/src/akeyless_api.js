const akeyless = require('akeyless');

function api(url, sdk = akeyless) {
  const client = new sdk.ApiClient();
  client.basePath = url;
  return new sdk.V2Api(client);
}

exports.api = api;
