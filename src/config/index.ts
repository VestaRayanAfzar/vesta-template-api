import { IDatabaseConfig } from "@vesta/core";
import { LogLevel } from "@vesta/services";
import { Algorithm } from "jsonwebtoken";
import { dirname } from "path";
import { cmnConfig, ICmnConfig } from "../cmn/config";
import { LogStorage } from "../helpers/LogFactory";

export interface ILogConfig {
    dir: string;
    level: LogLevel;
    rotationInterval: number;
    storage: LogStorage;
}

export interface ISessionConfig {
    hashing: Algorithm;
    idPrefix: string;
    maxAge: number | string;
}

export interface ISecurityConfig {
    guestRoleName: string;
    hashing: string;
    rootRoleName: string;
    salt: string;
    secret: string;
    userRoleName: string;
}

export interface IDirConfig {
    root: string;
    upload: string;
}

export interface IAppConfig extends ICmnConfig {
    database: IDatabaseConfig;
    dir: IDirConfig;
    env: string;
    log: ILogConfig;
    port: number;
    regenerateSchema: boolean;
    security: ISecurityConfig;
    session: ISessionConfig;
    version: {
        api: string;
        app: string;
    };
}

const env = process.env;

const appConfig: IAppConfig = {
    database: {
        database: env.ADB_NAME,
        host: env.ADB_HOST,
        password: env.ADB_PASSWORD,
        port: +env.ADB_PORT,
        protocol: env.ADB_PROTOCOL,
        user: env.ADB_USERNAME,
    },
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
    regenerateSchema: false,
    security: {
        guestRoleName: "guest",
        hashing: "sha256",
        rootRoleName: "root",
        salt: env.SALT,
        secret: env.SECRET_KEY,
        userRoleName: "user",
    },
    session: {
        hashing: "HS256",
        idPrefix: "sess:",
        maxAge: env.JWT_EXPIRE_TIME,
    },
    version: cmnConfig.version,
};

export default appConfig;
