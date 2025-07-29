// Simple logging engine for AnthonChat Web Application
// Replaces the temporary console-based loggers with a structured approach

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  constructor(
    private context: string,
    private level: LogLevel = LogLevel.INFO
  ) {}

  debug(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${this.context}: ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${this.context}: ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${this.context}: ${message}`, ...args);
    }
  }

  error(message: string, error?: Error, ...args: unknown[]) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${this.context}: ${message}`, error, ...args);
    }
  }
}

export function createLogger(context: string): Logger {
  const level = process.env.NODE_ENV === 'development' 
    ? LogLevel.DEBUG 
    : LogLevel.INFO;
  return new Logger(context, level);
}