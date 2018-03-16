import { LogLevel } from "../cmn/models/Log";
import { IDatabaseConfig } from "../medium";
import { LogStorage } from "./LogFactory";

export interface ILogConfig {
    level: LogLevel;
    storage: LogStorage;
    dir: string;
    rotationInterval: number;
}

export interface ISessionConfig {
    maxAge: number;
    idPrefix: string;
    hashing: string;
    database: IDatabaseConfig;
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

export interface IDirConfig {
    root: string;
    upload: string;
}

export interface IServerAppVariantConfig {
    regenerateSchema: boolean;
}

export interface IServerAppConfig extends IServerAppVariantConfig {
    env: string;
    log: ILogConfig;
    version: { app: string; api: string };
    database: IDatabaseConfig;
    port: number;
    dir: IDirConfig;
    security: ISecurityConfig;
}

export class Config {

    public static init(config: IServerAppConfig) {
        Config.config = config;
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

    public static set<T>(key: string, value: T) {
        Config.storage[key] = value;
    }

    private static config: IServerAppConfig;
    private static storage: any = {};
}
