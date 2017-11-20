import {appendFile, existsSync, writeFileSync} from "fs";
import {ILogConfig} from "./Config";
import {Logger} from "./Logger";
import {ILogger} from "../cmn/interface/ILogger";

export const enum LogStorage {Console = 1, File}

export class LogFactory {
    static config: ILogConfig;
    static logFile: string;

    static init(logConfig: ILogConfig) {
        LogFactory.config = logConfig;
        let now = new Date();
        if (logConfig.storage == LogStorage.Console) {
            return true;
        }
        LogFactory.logFile = `${logConfig.dir}/${now.getTime()}-logger.log`;
        try {
            if (!existsSync(LogFactory.logFile)) {
                writeFileSync(`${LogFactory.logFile}`, `Initiating at ${now}`);
            }
        } catch (e) {
            console.log('LogFactory.init ERROR::', e);
            return false;
        }
        return true;
    }

    static create() {
        return new Logger(LogFactory.config.level);
    }

    static save(log: ILogger) {
        if (LogFactory.config.storage == LogStorage.Console) {
            console.log(`=== Level: ${log.level} === Start: ${log.start} === Duration: ${log.duration}`);
            for (let i = 0, il = log.data.length; i < il; ++i) {
                console.log(log.data[i]);
            }
            return;
        }
        appendFile(LogFactory.logFile, `\n${JSON.stringify(log)}`, {encoding: 'utf8'}, err => {
            console.error(err);
        });
    }
}