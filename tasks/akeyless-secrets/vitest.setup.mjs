import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const taskLibPath = require.resolve('azure-pipelines-task-lib/task');
const taskLibMock = require('./_tests_/mocks/azure-pipelines-task-lib');

require.cache[taskLibPath] = {
  id: taskLibPath,
  filename: taskLibPath,
  loaded: true,
  exports: taskLibMock
};
