export async function register() {
  const timestamp = () => new Date().toISOString();
  const originalLog = console.log.bind(console);
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalInfo = console.info.bind(console);

  console.log = (...args: unknown[]) => originalLog(`[${timestamp()}]`, ...args);
  console.error = (...args: unknown[]) => originalError(`[${timestamp()}]`, ...args);
  console.warn = (...args: unknown[]) => originalWarn(`[${timestamp()}]`, ...args);
  console.info = (...args: unknown[]) => originalInfo(`[${timestamp()}]`, ...args);
}
