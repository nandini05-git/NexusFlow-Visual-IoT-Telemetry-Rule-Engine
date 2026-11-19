export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : (err.statusCode || 500);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: messages,
      success: false,
      message: 'Validation Error',
      errors: messages,
    });
  }

  // Bad JSON input / body-parser syntax error
  if (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400) && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON payload received',
      details: err.message,
      success: false,
      message: 'Invalid JSON payload received',
    });
  }

  // Payload too large
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      error: 'Payload Too Large',
      details: 'Request payload exceeds the configured limit (10MB)',
      success: false,
      message: 'Payload Too Large',
    });
  }

  // CastError (e.g. invalid date or ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid format for field ${err.path}`,
      details: err.message,
      success: false,
      message: `Invalid format for field ${err.path}`,
    });
  }

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    details: err.details || null,
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
