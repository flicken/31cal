/**
 * Debug logging that is stripped to a no-op in production builds, so event
 * contents, tokens and user details never end up in a shared console.
 */
export const debug: (...args: unknown[]) => void = import.meta.env.DEV
  ? (...args) => console.log(...args)
  : () => {};
