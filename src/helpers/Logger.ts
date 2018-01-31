import {LogFactory} from "./LogFactory";
import {ILog, LogLevel} from "../cmn/models/Log";
import {IUser, SourceApp} from "../cmn/models/User";

export interface ILogger {
    start: number;
    duration: number;
    level: number;
    user: number | IUser;
    sourceApp: SourceApp;
    logs: Array<ILog>;
}

export interface LoggerFunction {
    (level: LogLevel, message: string, method?: string, file?: string): void;
}

export class Logger {
    private iLogger: ILogger;

    constructor(level: LogLevel, user?: number, sourceApp?: SourceApp) {
        this.iLogger = <ILogger>{start: Date.now(), level: +level, user, sourceApp, logs: []};
    }

    public log = (level: LogLevel, message: string, method?: string, file?: string) => {
        if (level > this.iLogger.level) return;
        this.iLogger.logs.push({level, message, method, file});
    }

    public save() {
        if (this.iLogger.level == LogLevel.None) return;
        if (!this.iLogger.logs.length) return;
        this.iLogger.duration = Date.now() - this.iLogger.start;
        LogFactory.save(this.iLogger);
    }
}