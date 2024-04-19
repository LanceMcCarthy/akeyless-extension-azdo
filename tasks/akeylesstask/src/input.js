const tl = require('azure-pipelines-task-lib/task');
const auth = require('./auth');

const stringInputs = {
  accessId: 'accessId',
  accessType: 'accessType',
  apiUrl: 'apiUrl',
  producerForAwsAccess: 'producerForAwsAccess'
};

const dictInputs = {
  staticSecrets: 'staticSecrets',
  dynamicSecrets: 'dynamicSecrets'
};

const fetchAndValidateInput = () => {
  const params = {
    accessId: tl.getInput('accessId', true),
    accessType: tl.getInput('accessType', false),
    apiUrl: tl.getInput('apiUrl', false),
    producerForAwsAccess: tl.getInput('producerForAwsAccess', false),
    staticSecrets: tl.getInput('staticSecrets', false),
    dynamicSecrets: tl.getInput('dynamicSecrets', false)
  };
  // our only required parameter
  if (!params['accessId']) {
    throw new Error('You must provide the access id for your auth method via the accessId input');
  }

  // check for string types
  for (const [paramKey, inputId] of Object.entries(stringInputs)) {
    if (typeof params[paramKey] !== 'string') {
      throw new Error(`Input '${inputId}' should be a string`);
    }
  }
  // check for dict types
  for (const [paramKey, inputId] of Object.entries(dictInputs)) {
    if (typeof params[paramKey] !== 'string') {
      throw new Error(`Input '${inputId}' should be a serialized JSON dictionary with the secret path as a key and the output name as the value`);
    }
    if (!params[paramKey]) {
      continue;
    }
    try {
      const parsed = JSON.parse(params[paramKey]);
      if (parsed.constructor !== Object) {
        throw new Error(`Input '${inputId}' did not contain a valid JSON dictionary`);
      }
      params[paramKey] = parsed;
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`Input '${inputId}' did not contain valid JSON`);
      } else {
        throw e;
      }
    }
  }
  // check access types
  if (!auth.allowedAccessTypes.includes(params['accessType'].toLowerCase())) {
    throw new Error("accessType must be one of: ['" + auth.allowedAccessTypes.join("', '") + "']");
  }
  params['accessType'] = params['accessType'].toLowerCase();

  return params;
};

exports.fetchAndValidateInput = fetchAndValidateInput;
