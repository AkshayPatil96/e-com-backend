import { createLogger, format, transports } from "winston";

const logTransports = [
  new transports.File({
    level: "error",
    // filename: "./logs/error.log",
    // create different log file for each day
    filename: `./logs/error-${new Date().toISOString().split("T")[0]}.log`,
    format: format.json({
      replacer: (key, value) => {
        if (key === "error") {
          return {
            message: (value as Error).message,
            stack: (value as Error).stack,
          };
        }
        return value;
      },
    }),
  }),

  new transports.Console({
    level: "debug",
    format: format.combine(
      format.colorize(),
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
      ),
    ),
  }),
];

const logger = createLogger({
  transports: logTransports,
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  defaultMeta: { service: "api" },
});

export default logger;
