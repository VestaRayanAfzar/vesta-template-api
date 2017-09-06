import {LogFactory} from "./LogFactory";
import {LogLevel} from "../cmn/enum/Log";
import {ILogger} from "../cmn/interface/ILogger";

export class Logger {
    private iLogger: ILogger;
    private benchmarks: any = {};
    private static instance: Logger;

    constructor(private level: LogLevel) {
        this.iLogger = <ILogger>{
            start: Date.now(),
            level: level,
            data: []
        };
        Logger.instance = this;
    }

    private shouldNotBeLogged(): boolean {
        return this.level <= LogFactory.config.level;
    }

    public debug(debug) {
        if (this.level > LogLevel.Debug) return;
        this.iLogger.data.push({type: LogLevel.Debug, data: debug});
    }

    public info(info) {
        if (this.level > LogLevel.Info) return;
        this.iLogger.data.push({type: LogLevel.Info, data: info});
    }

    public warn(warn) {
        if (this.level > LogLevel.Warn) return;
        this.iLogger.data.push({type: LogLevel.Warn, data: warn});
    }

    public err(err) {
        if (this.level > LogLevel.Error) return;
        this.iLogger.data.push({type: LogLevel.Error, data: err});
    }

    public startBenchmark(name: string) {
        if (this.level > LogLevel.Verbose) return;
        this.benchmarks[name] = {
            timestamp: process.hrtime(),
            cpuUsage: process.cpuUsage(),
            memUsage: process.memoryUsage()
        }
    }

    public stopBenchMark(name: string) {
        if (this.level > LogLevel.Verbose) return;
        let bm = this.benchmarks[name];
        if (!bm) return;
        let memUsage = process.memoryUsage();
        this.iLogger.data.push({
            type: LogLevel.Verbose,
            data: {
                name: name,
                duration: process.hrtime(bm.timestamp),
                cpuUsage: process.cpuUsage(bm.cpuUsage),
                memUsage: {
                    rss: bm.memUsage.rss - memUsage.rss
                }
            }
        });
        delete this.benchmarks[name];
    }

    public done(content?: string) {
        if (this.level == LogLevel.None) return;
        if (content) this.iLogger.data.push(content);
        this.iLogger.duration = Date.now() - this.iLogger.start;
        LogFactory.save(this.iLogger);
    }

    public static getInstance(): Logger {
        return Logger.instance;
    }
}