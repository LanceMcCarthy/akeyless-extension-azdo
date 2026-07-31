const mockTaskLib = {
  getInput: jest.fn(),
  setVariable: jest.fn(),
  getVariable: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  setResult: jest.fn(),
  setSecret: jest.fn(),
  TaskResult: {
    Succeeded: 'Succeeded',
    SucceededWithIssues: 'SucceededWithIssues',
    Failed: 'Failed'
  }
};

module.exports = mockTaskLib;
