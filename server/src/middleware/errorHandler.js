// Centralized error handler. Keeps stack traces out of API responses in prod.
export function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Something went wrong.'
      : err.message || 'Something went wrong.';

  res.status(status).json({ error: message });
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found.' });
}
