import { LogLevel } from "@vesta/services";
import { SourceApp } from "../cmn/enum/SourceApp";
import { ILogger } from "../cmn/interfaces/Logger";
import { ILog } from "../cmn/models/Log";
import { LogFactory } from "./LogFactory";

export type LoggerFunction = (level: LogLevel, message: string, method?: string, file?: string) => void;

export class Logger {
    private iLogger: ILogger;

    constructor(level: LogLevel, user?: number, sourceApp?: SourceApp) {
        this.iLogger = { start: Date.now(), level: +level, user, sourceApp, logs: [] };
    }

    public log = (level: LogLevel, message: string, method?: string, file?: string) => {
        if (level > this.iLogger.level) { return; }
        this.iLogger.logs.push({ level, message, method, file });
    }

    public save() {
        if (this.iLogger.level === LogLevel.None) { return; }
        if (!this.iLogger.logs.length) { return; }
        this.iLogger.duration = Date.now() - this.iLogger.start;
        LogFactory.save(this.iLogger);
    }
}