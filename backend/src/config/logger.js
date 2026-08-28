import winston from 'winston';
import 'winston-daily-rotate-file';
import { env } from './env.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Formats a log entry as a single timestamped line, appending the stack
 * trace when one is present.
 *
 * @param {{ level: string, message: string, timestamp: string, stack?: string }} info - The winston log info object.
 * @returns {string} The formatted log line.
 */
const logFormat = printf(({ level, message, timestamp, stack }) => {
  const line = `${timestamp} [${level}]: ${message}`;
  return stack ? `${line}\n${stack}` : line;
});

const transports = [
  new winston.transports.DailyRotateFile({
    dirname: 'logs',
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: combine(timestamp(), errors({ stack: true }), logFormat),
  }),
];

if (env.nodeEnv !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: combine(colorize({ level: true }), timestamp(), errors({ stack: true }), logFormat),
    })
  );
}

/**
 * The application logger: daily-rotating file always, plus colored console
 * output outside production. This is the only permitted logging surface
 * on the backend (no console.log).
 *
 * @type {import('winston').Logger}
 */
export const logger = winston.createLogger({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  transports,
});