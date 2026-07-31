// Suppress known Azure DevOps task-lib warning noise in test runs while preserving other warnings.
const suppressedFragments = ['--localstorage-file', 'Warning: `--localstorage-file` was provided without a valid path', '##vso[task.debug]'];

let originalConsoleWarn;
let originalEmitWarning;

function shouldSuppressText(value) {
  return typeof value === 'string' && suppressedFragments.some(fragment => value.includes(fragment));
}

beforeAll(() => {
  originalConsoleWarn = console.warn;
  originalEmitWarning = process.emitWarning;

  console.warn = (...args) => {
    const message = args.join(' ');
    if (shouldSuppressText(message)) {
      return;
    }
    originalConsoleWarn(...args);
  };

  process.emitWarning = (warning, ...args) => {
    if (shouldSuppressText(warning) || shouldSuppressText(warning?.message)) {
      return;
    }
    originalEmitWarning.call(process, warning, ...args);
  };

  process.env.NODE_NO_WARNINGS = '1';
});

afterAll(() => {
  if (originalConsoleWarn) {
    console.warn = originalConsoleWarn;
  }

  if (originalEmitWarning) {
    process.emitWarning = originalEmitWarning;
  }
});
