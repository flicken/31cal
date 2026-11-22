export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a case-insensitive RegExp from user input. Invalid patterns fall back
 * to a literal match instead of throwing during render.
 */
export function safeRegExp(
  text: string,
  flags = 'i',
): { regex: RegExp; error?: string } {
  try {
    return { regex: new RegExp(text, flags) };
  } catch (e) {
    return {
      regex: new RegExp(escapeRegExp(text), flags),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
