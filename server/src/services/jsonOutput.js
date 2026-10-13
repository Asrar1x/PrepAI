/**
 * Parses JSON from model output (tolerates code fences / surrounding prose).
 * Returns null when no valid JSON object is present; callers treat that as a schema failure.
 */
function parseModelJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

module.exports = { parseModelJson };
