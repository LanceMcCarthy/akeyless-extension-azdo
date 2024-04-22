jest.mock('azure-pipelines-task-lib/task');

tl = require('azure-pipelines-task-lib/task');
input = require('../src/input');

test('Input is all good', () => {
  tl.getInput = jest.fn();
  tl.getInput.mockReturnValueOnce('p-asdf');
  tl.getInput.mockReturnValueOnce('token');
  tl.getInput.mockReturnValueOnce('{"/some/static/secret":"secret_key"}');
  tl.getInput.mockReturnValueOnce('{"/some/dynamic/secret":"other_key"}');

  tl.getBoolInput = jest.fn();
  tl.getBoolInput.mockReturnValueOnce(true);
  tl.getBoolInput.mockReturnValueOnce(true);
  tl.getBoolInput.mockReturnValueOnce(false);

  params = input.fetchAndValidateInput();

  // assert
  expect(params).toEqual({
    accessId: 'p-asdf',
    azureJwt: 'token',
    staticSecrets: {'/some/static/secret': 'secret_key'},
    dynamicSecrets: {'/some/dynamic/secret': 'other_key'},
    exportSecretsToOutputs: true,
    exportSecretsToEnvironment: true,
    parseDynamicSecrets: false
  });
  expect(tl.getInput.mock.calls).toEqual([['accessId', true], ['azureJwt', true], ['staticSecrets'], ['dynamicSecrets']]);
  expect(tl.getBoolInput.mock.calls).toEqual([['exportSecretsToOutputs'], ['exportSecretsToEnvironment'], ['parseDynamicSecrets']]);
});

// test('check string', () => {
//   tl.getInput = jest.fn();
//   tl.getInput.mockReturnValueOnce('p-asdf');
//   tl.getInput.mockReturnValue('token');

//   expect(() => {
//     input.fetchAndValidateInput();
//   }).toThrow("Input 'accessType' should be a string");
// });

// test('invalid access type', () => {
//   tl.getInput = jest.fn();
//   tl.getInput.mockReturnValueOnce('p-asdf');
//   tl.getInput.mockReturnValueOnce('asdf');
//   tl.getInput.mockReturnValueOnce('token');
//   tl.getInput.mockReturnValueOnce('https://api.akeyless.io');
//   tl.getInput.mockReturnValueOnce('/path/to/aws/producer');
//   tl.getInput.mockReturnValueOnce('{"/some/static/secret":"secret_key"}');
//   tl.getInput.mockReturnValueOnce('{"/some/dynamic/secret":"other_key"}');
//   tl.getBoolInput = jest.fn();
//   tl.getBoolInput.mockReturnValueOnce(true);
//   tl.getBoolInput.mockReturnValueOnce(true);
//   tl.getBoolInput.mockReturnValueOnce(false);

//   expect(() => {
//     input.fetchAndValidateInput();
//   }).toThrow("accessType must be one of: ['jwt', 'aws_iam']");
// });
