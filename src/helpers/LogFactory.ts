import * as fs from "fs";
import {Logger} from "./Logger";
import {ILogConfig} from "../config/config";
import {ILogger} from "../cmn/interface/ILogger";

export const enum LogStorage  {Console = 1, File}

export class LogFactory {
    static setting: ILogConfig;
    static logFile: string;

    static init(setting: ILogConfig) {
        LogFactory.setting = setting;
        let now = new Date();
        if (setting.storage == LogStorage.Console) {
            return true;
        }
        LogFactory.logFile = `${setting.dir}/${now.getTime()}-logger.log`;
        try {
            if (!fs.existsSync(LogFactory.logFile)) {
                fs.writeFileSync(`${LogFactory.logFile}`, `Initiating at ${now}`);
            }
        } catch (e) {
            console.log('LogFactory.init ERROR::', e);
            return false;
        }
        return true;
    }

    static create() {
        return new Logger(LogFactory.setting.level);
    }

    static save(log: ILogger) {
        if (LogFactory.setting.storage == LogStorage.Console) {
            console.log(`=== Level: ${log.level} === Start: ${log.start} === Duration: ${log.duration}`);
            for (let i = 0, il = log.data.length; i < il; ++i) {
                console.log(log.data[i]);
            }
            return;
        }
        fs.appendFile(LogFactory.logFile, `\n${JSON.stringify(log)}`, {encoding: 'utf8'}, err => {
            console.error(err);
        });
    }
}