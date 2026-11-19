/**
 * Global Error Handling and 404 Middleware
 */

export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Resource not found: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';

    // 1. Mongoose Bad ObjectId / CastError
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid format for field '${err.path}': ${err.value}`;
    }

    // 2. Mongoose Duplicate Key Error (Code 11000)
    else if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        const value = err.keyValue ? err.keyValue[field] : '';
        message = `Duplicate key error: '${field}' with value '${value}' already exists.`;
    }

    // 3. Mongoose Schema Validation Error
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors)
            .map(val => val.message)
            .join(', ');
    }

    // 4. Malformed JSON Body
    else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        statusCode = 400;
        message = 'Malformed JSON payload in request body.';
    }

    // 5. JWT Authentication Errors
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid authentication token.';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication token has expired. Please log in again.';
    }

    // Log error for server diagnostics with resolved statusCode
    console.error(`[Global Error Handler] [${req.method}] ${req.originalUrl} - Status: ${statusCode}:`, {
        name: err.name,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });

    // Return unified structured JSON response
    res.status(statusCode).json({
        success: false,
        message,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
