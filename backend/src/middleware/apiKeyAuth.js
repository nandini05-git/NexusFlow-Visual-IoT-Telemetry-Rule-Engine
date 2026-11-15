/**
 * Optional API key validation for telemetry ingestion endpoints.
 * If INGEST_API_KEY is not defined in the environment, the check is skipped.
 * If defined, the incoming request must present a matching 'x-api-key' header.
 */
export const optionalApiKeyCheck = (req, res, next) => {
  const configuredKey = process.env.INGEST_API_KEY;

  // Skip check if no key is configured
  if (!configuredKey || configuredKey.trim() === '') {
    return next();
  }

  const clientKey = req.headers['x-api-key'];
  if (!clientKey || clientKey !== configuredKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing x-api-key header.',
    });
  }

  next();
};
