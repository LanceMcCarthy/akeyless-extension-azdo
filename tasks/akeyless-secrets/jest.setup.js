// Suppress Azure DevOps task library warnings in test environment

// Suppress console warnings
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');

  // Suppress specific Azure DevOps task library warnings
  if (message.includes('--localstorage-file') || message.includes('Warning: `--localstorage-file` was provided without a valid path') || message.includes('##vso[task.debug]')) {
    return;
  }

  // Allow other warnings through
  originalConsoleWarn(...args);
};

// Suppress process warnings for localstorage-file
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
  if (typeof warning === 'string' && warning.includes('--localstorage-file')) {
    return;
  }
  if (typeof warning === 'object' && warning.message && warning.message.includes('--localstorage-file')) {
    return;
  }
  originalEmitWarning.call(process, warning, ...args);
};

// Set NODE_NO_WARNINGS environment variable to suppress Node warnings during tests
process.env.NODE_NO_WARNINGS = '1';
