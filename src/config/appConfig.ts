import { dirname } from "path";
import { cmnConfig, ICmnConfig } from "../cmn/config/cmnConfig";
import { LogLevel } from "../cmn/models/Log";
import { LogStorage } from "../helpers/LogFactory";
import { IDatabaseConfig } from "../medium";
import { IVariantConfig, variantConfig } from "./variantConfig";

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

export interface IAppConfig extends IVariantConfig, ICmnConfig {
    env: string;
    log: ILogConfig;
    version: { app: string; api: string };
    database: IDatabaseConfig;
    port: number;
    dir: IDirConfig;
    security: ISecurityConfig;
}

const env = process.env;

export const appConfig: IAppConfig = {
    database: {
        database: env.ADB_NAME,
        host: env.ADB_HOST,
        password: env.ADB_PASSWORD,
        port: +env.ADB_PORT,
        protocol: env.ADB_PROTOCOL,
        user: env.ADB_USERNAME,
    } as IDatabaseConfig,
    dir: {
        root: dirname(__dirname),
        upload: "/upload",
    },
    env: env.NODE_ENV,
    locale: cmnConfig.locale,
    log: {
        dir: "/log",
        level: +env.LOG_LEVEL,
        // rotate log file every 3 days
        rotationInterval: 3 * 24 * 3600000,
        storage: env.NODE_ENV === "development" ? LogStorage.Console : LogStorage.File,
    },
    name: cmnConfig.name,
    port: +env.PORT,
    regenerateSchema: variantConfig.regenerateSchema,
    security: {
        guestRoleName: "guest",
        hashing: "sha256",
        rootRoleName: "root",
        salt: env.SALT,
        secret: env.SECRET_KEY,
        session: {
            database: {
                host: env.SDB_HOST,
                port: +env.SDB_PORT,
                protocol: env.SDB_PROTOCOL,
            } as IDatabaseConfig,
            hashing: "HS256",
            idPrefix: "sess:",
            maxAge: 0,
        },
        userRoleName: "user",
    },
    version: cmnConfig.version,
};
