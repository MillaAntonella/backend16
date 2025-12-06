const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    })
  ]
});

const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
};

const devLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Body: ${JSON.stringify(req.body)}`);
  }
  next();
};

module.exports = { logger, requestLogger, devLogger };