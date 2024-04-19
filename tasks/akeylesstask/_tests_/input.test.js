jest.mock('azure-pipelines-task-lib/task');

tl = require('azure-pipelines-task-lib/task');
input = require('../src/input');

test('Input is all good', () => {
  tl.getInput = jest.fn();
  tl.getInput.mockReturnValueOnce('p-asdf');
  tl.getInput.mockReturnValueOnce('JWT');
  tl.getInput.mockReturnValueOnce('https://api.akeyless.io');
  tl.getInput.mockReturnValueOnce('/path/to/aws/producer');
  tl.getInput.mockReturnValueOnce('{"/some/static/secret":"secret_key"}');
  tl.getInput.mockReturnValueOnce('{"/some/dynamic/secret":"other_key"}');
  tl.getBoolInput = jest.fn();
  tl.getBoolInput.mockReturnValueOnce(true);
  tl.getBoolInput.mockReturnValueOnce(true);
  tl.getBoolInput.mockReturnValueOnce(false);

  params = input.fetchAndValidateInput();

  expect(params).toEqual({
    accessId: 'p-asdf',
    accessType: 'jwt',
    apiUrl: 'https://api.akeyless.io',
    producerForAwsAccess: '/path/to/aws/producer',
    staticSecrets: {'/some/static/secret': 'secret_key'},
    dynamicSecrets: {'/some/dynamic/secret': 'other_key'},
    exportSecretsToOutputs: true,
    exportSecretsToEnvironment: true,
    parseDynamicSecrets: false
  });

  expect(tl.getInput.mock.calls).toEqual([['access-id', {required: true}], ['access-type'], ['api-url'], ['producer-for-aws-access'], ['static-secrets'], ['dynamic-secrets']]);

  expect(tl.getBoolInput.mock.calls).toEqual([
    ['export-secrets-to-outputs', {default: true}],
    ['export-secrets-to-environment', {default: true}],
    ['parse-dynamic-secrets', {default: false}]
  ]);
});

test('check string', () => {
  tl.getInput = jest.fn();
  tl.getInput.mockReturnValueOnce('p-asdf');
  tl.getInput.mockReturnValueOnce(343);
  tl.getInput.mockReturnValue('sup');

  expect(() => {
    input.fetchAndValidateInput();
  }).toThrow("Input 'accessType' should be a string");
});

test('invalid access type', () => {
  tl.getInput = jest.fn();
  tl.getInput.mockReturnValueOnce('p-asdf');
  tl.getInput.mockReturnValueOnce('asdf');
  tl.getInput.mockReturnValueOnce('https://api.akeyless.io');
  tl.getInput.mockReturnValueOnce('/path/to/aws/producer');
  tl.getInput.mockReturnValueOnce('{"/some/static/secret":"secret_key"}');
  tl.getInput.mockReturnValueOnce('{"/some/dynamic/secret":"other_key"}');
  tl.getBoolInput = jest.fn();
  tl.getBoolInput.mockReturnValueOnce(true);
  tl.getBoolInput.mockReturnValueOnce(true);
  tl.getBoolInput.mockReturnValueOnce(false);
  
  expect(() => {
    input.fetchAndValidateInput();
  }).toThrow("accessType must be one of: ['jwt', 'aws_iam']");
});
