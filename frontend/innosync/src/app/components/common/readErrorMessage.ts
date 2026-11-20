/**
 * The message to show for a failed API response.
 * Our controllers answer some errors in plain text ("Email is already registered!") and Spring answers
 * others as JSON ({ message } or { error }), so accept both and never show raw JSON.
 */
export async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const text = (await res.text()).trim();
    if (!text) return fallback;
    if (text.startsWith("{")) {
      const body = JSON.parse(text);
      const msg = body.message || body.error;
      return typeof msg === "string" && msg ? msg : fallback;
    }
    // An HTML error page from a proxy is not a message.
    return text.startsWith("<") ? fallback : text;
  } catch {
    return fallback;
  }
}
