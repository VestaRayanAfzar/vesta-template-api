import {LogLevel} from "../cmn/enum/Log";
import {LogStorage} from "./LogFactory";
import {IDatabaseConfig} from "../cmn/core/Database";
import {ITextMessageConfig} from "./TextMessage";

export interface IAdminConfig {
    logLevel: number;
    monitoring: boolean;
    samplingInterval: number;
}

export interface ILogConfig {
    level: LogLevel;
    dir: string;
    storage?: LogStorage;
}

export interface ISessionConfig {
    maxAge: number;
    idPrefix: string;
    hashing: string;
    database: IDatabaseConfig
}

export interface ISecurityConfig {
    secret: string;
    salt: string;
    hashing: string;
    guestRoleName: string;
    rootRoleName: string;
    userRoleName: string;
    session: ISessionConfig;
}

export interface IServerAppVariantConfig {
    regenerateSchema: boolean;
    http2: boolean;
}

export interface IServerAppConfig extends IServerAppVariantConfig {
    env: string;
    log: ILogConfig;
    version: { app: string; api: string };
    database: IDatabaseConfig;
    port: number;
    ssl?: { key: string, cert: string }
    dir: {
        root: string;
        upload: string;
        log: string;
    };
    security: ISecurityConfig;
    sms?: ITextMessageConfig;
}

export class Config {
    private static config: IServerAppConfig;
    private static storage: any = {};

    public static init(config: IServerAppConfig) {
        Config.config = config;
    }

    public static set<T>(key: string, value: T) {
        Config.storage[key] = value;
    }

    public static get<T>(key: string, defaultValue?: T) {
        if (key in Config.storage) {
            return Config.storage[key] as T;
        }
        if (key in Config.config) {
            return Config.config[key] as T;
        }
        return defaultValue;
    }

    public static getConfig(): IServerAppConfig {
        return Config.config;
    }
}