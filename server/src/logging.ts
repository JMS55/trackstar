import winston, { format } from 'winston';

const logger = winston.createLogger({
    transports: [new winston.transports.Console()],
    format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.align(),
        format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    level: process.env.TS_LOG_LEVEL ?? 'debug',
});

/** Return pretty JSON string given any valid JSON string */
export function prettyJson(input: string) {
    return JSON.stringify(JSON.parse(input), null, 2);
}

export default logger;
