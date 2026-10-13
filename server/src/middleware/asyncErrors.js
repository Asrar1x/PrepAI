/**
 * Express 4 does not catch errors thrown by async route handlers: a rejected promise escapes as an
 * unhandled rejection, the request hangs and — on current Node versions — the whole API process
 * exits. This patch makes every handler's rejected promise go to `next(err)`, so the global error
 * handler answers it (same approach as the `express-async-errors` package).
 * Require it once, before any router is created.
 */
const Layer = require('express/lib/router/layer');

if (!Layer.prototype.__prepaiAsyncPatched) {
  const original = Layer.prototype.handle_request;
  Layer.prototype.handle_request = function handleRequest(req, res, next) {
    // Error-handling middleware (4 args) keeps Express's own behaviour
    if (this.handle.length > 3) return original.call(this, req, res, next);
    try {
      const result = this.handle(req, res, next);
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (err) {
      next(err);
    }
    return undefined;
  };
  Layer.prototype.__prepaiAsyncPatched = true;
}

/** Maps database validation/cast errors (bad client input) to 400 instead of 500. */
function statusFor(err) {
  if (err && (err.name === 'ValidationError' || err.name === 'CastError')) return 400;
  if (err && err.type === 'entity.parse.failed') return 400; // malformed JSON body
  if (err && err.type === 'entity.too.large') return 413;
  return err.status || err.statusCode || 500;
}

module.exports = { statusFor };
