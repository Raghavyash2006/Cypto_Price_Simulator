export function buildApiResponse({ success = true, message = '', data = null, meta = {}, errors = [] } = {}) {
  const response = { success };

  if (message) response.message = message;
  if (data !== null) response.data = data;
  if (meta && Object.keys(meta).length > 0) response.meta = meta;
  if (errors.length) response.errors = errors;

  return response;
}

export function sendSuccess(res, { statusCode = 200, message = 'Success', data = null, meta = {} } = {}) {
  return res.status(statusCode).json(buildApiResponse({ success: true, message, data, meta }));
}

export function sendCreated(res, { message = 'Created', data = null, meta = {} } = {}) {
  return sendSuccess(res, { statusCode: 201, message, data, meta });
}

export function sendError(res, { statusCode = 500, message = 'Server error', errors = [] } = {}) {
  return res.status(statusCode).json(buildApiResponse({ success: false, message, errors }));
}
