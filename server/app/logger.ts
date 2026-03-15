export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  subsystem: string;
  event: string;
  message: string;
  context?: Record<string, unknown>;
  incidentId?: string;
  sourceName?: string;
  receiverId?: string;
  adapterName?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface Logger {
  debug(event: string, message: string, context?: Record<string, unknown>): void;
  info(event: string, message: string, context?: Record<string, unknown>): void;
  warn(event: string, message: string, context?: Record<string, unknown>): void;
  error(event: string, message: string, error?: Error, context?: Record<string, unknown>): void;
}

class StructuredLogger implements Logger {
  private logLevel: LogLevel = 'info';
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && this.levels[envLevel] !== undefined) {
      this.logLevel = envLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatEntry(level: LogLevel, subsystem: string, event: string, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      subsystem,
      event,
      message,
      ...context
    };
  }

  private log(level: LogLevel, subsystem: string, event: string, message: string, context?: Record<string, unknown>, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry = this.formatEntry(level, subsystem, event, message, context);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    const output = JSON.stringify(entry);
    
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(event: string, message: string, context?: Record<string, unknown>): void {
    this.log('debug', this.getSubsystem(), event, message, context);
  }

  info(event: string, message: string, context?: Record<string, unknown>): void {
    this.log('info', this.getSubsystem(), event, message, context);
  }

  warn(event: string, message: string, context?: Record<string, unknown>): void {
    this.log('warn', this.getSubsystem(), event, message, context);
  }

  error(event: string, message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', this.getSubsystem(), event, message, context, error);
  }

  private getSubsystem(): string {
    return 'server';
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  child(subsystem: string): Logger {
    const parent = this;
    return {
      debug(event: string, message: string, context?: Record<string, unknown>) {
        parent.log('debug', subsystem, event, message, context);
      },
      info(event: string, message: string, context?: Record<string, unknown>) {
        parent.log('info', subsystem, event, message, context);
      },
      warn(event: string, message: string, context?: Record<string, unknown>) {
        parent.log('warn', subsystem, event, message, context);
      },
      error(event: string, message: string, error?: Error, context?: Record<string, unknown>) {
        parent.log('error', subsystem, event, message, context, error);
      }
    };
  }
}

export const logger = new StructuredLogger();

export const subsystemLoggers = {
  api: logger.child('api'),
  adapter: logger.child('adapter'),
  ingestion: logger.child('ingestion'),
  incident: logger.child('incident'),
  receiver: logger.child('receiver'),
  replay: logger.child('replay'),
  analytics: logger.child('analytics'),
  websocket: logger.child('websocket'),
  job: logger.child('job'),
  db: logger.child('db'),
  health: logger.child('health')
};
