import { appendFile, existsSync, writeFileSync } from "fs";
import { ILogger } from "../cmn/interfaces/Log";
import { ILog } from "../cmn/models/Log";
import { SourceApp } from "../cmn/models/User";
import { ILogConfig } from "../config/appConfig";
import { Logger } from "./Logger";

export const enum LogStorage { Console = 1, File }

export class LogFactory {
    public static init(logConfig: ILogConfig) {
        LogFactory.config = logConfig;
        if (logConfig.storage === LogStorage.Console) {
            return true;
        }
        return LogFactory.rotate();
    }

    public static create(user?: number, sourceApp?: SourceApp) {
        return new Logger(LogFactory.config.level, user, sourceApp);
    }

    public static save(log: ILogger) {
        if (LogFactory.config.storage === LogStorage.Console) {
            // tslint:disable-next-line:no-console max-line-length
            console.log(`\nLevel: ${log.level}, Start: ${log.start}, Duration: ${log.duration}, User: ${log.user}, App: ${log.sourceApp}`);
            for (let i = 0, il = log.logs.length; i < il; ++i) {
                LogFactory.formatLog(log.logs[i]);
            }
            return;
        }
        // saving to file
        appendFile(LogFactory.logFile, `\n${JSON.stringify(log)}`, { encoding: "utf8" }, (error) => {
            if (error) {
                // tslint:disable-next-line:no-console
                console.error("[LogFactory::save] ", error);
            }
        });
    }

    private static config: ILogConfig;
    private static logFile: string;

    private static formatLog(log: ILog) {
        // tslint:disable-next-line:no-console
        console.log(`  Level[${log.level}] @${log.file || ""}::${log.method || ""}\n    ${log.message}`);
    }

    private static rotate() {
        const { dir, rotationInterval } = LogFactory.config;
        const now = Date.now();
        const logFile = `${dir}/${now}-logger.log`;
        try {
            if (!existsSync(logFile)) {
                writeFileSync(`${logFile}`, `Initiating at ${now}`);
            }
            LogFactory.logFile = logFile;
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error("[LogFactory::rotate] ", error);
            return false;
        }
        setTimeout(LogFactory.rotate, rotationInterval);
        return true;
    }
}
