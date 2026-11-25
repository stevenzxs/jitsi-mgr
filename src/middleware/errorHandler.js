export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // 默认 500 错误
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An internal server error occurred';

  // 根据错误类型设置状态码
  if (err.message.includes('not found')) {
    statusCode = 404;
    errorCode = 'RESOURCE_NOT_FOUND';
    message = err.message;
  } else if (err.message.includes('already exists')) {
    statusCode = 409;
    errorCode = 'RESOURCE_ALREADY_EXISTS';
    message = err.message;
  } else if (err.message.includes('validation') || err.message.includes('required')) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    timestamp: new Date().toISOString()
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    },
    timestamp: new Date().toISOString()
  });
};
