import {appendFile, existsSync, writeFileSync} from "fs";
import {ILogConfig} from "./Config";
import {ILogger, Logger} from "./Logger";
import {SourceApp} from "../cmn/models/User";
import {ILog} from "../cmn/models/Log";

export const enum LogStorage {Console = 1, File}

export class LogFactory {
    private static config: ILogConfig;
    private static logFile: string;

    private static rotate() {
        const {dir, rotationInterval} = LogFactory.config;
        let now = Date.now();
        LogFactory.logFile = `${dir}/${now}-logger.log`;
        try {
            if (!existsSync(LogFactory.logFile)) {
                writeFileSync(`${LogFactory.logFile}`, `Initiating at ${now}`);
            }
        } catch (error) {
            console.error('[LogFactory::init] ', error);
            return false;
        }
        setTimeout(LogFactory.rotate, rotationInterval);
        return true;
    }

    public static init(logConfig: ILogConfig) {
        LogFactory.config = logConfig;
        if (logConfig.storage == LogStorage.Console) {
            return true;
        }
        return LogFactory.rotate();
    }

    public static create(user?: number, sourceApp?: SourceApp) {
        return new Logger(LogFactory.config.level, user, sourceApp);
    }

    public static save(log: ILogger) {
        if (LogFactory.config.storage == LogStorage.Console) {
            console.log(`\nLevel: ${log.level}, Start: ${log.start}, Duration: ${log.duration}, User: ${log.user}, App: ${log.sourceApp}`);
            for (let i = 0, il = log.logs.length; i < il; ++i) {
                LogFactory.formatLog(log.logs[i]);
            }
            return;
        }
        // saving to file
        appendFile(LogFactory.logFile, `\n${JSON.stringify(log)}`, {encoding: 'utf8'}, error => {
            if (error) {
                console.error('[LogFactory::save] ', error);
            }
        });
    }

    private static formatLog(log: ILog) {
        console.log(`  Level[${log.level}] @${log.file || ''}::${log.method || ''}\n    ${log.message}`);
    }
}