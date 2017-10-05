import * as fs from "fs";
import {LogStorage} from "../helpers/LogFactory";
import {LogLevel} from "../cmn/enum/Log";
import {IDatabaseConfig} from "@vesta/core";
import {dirname} from "path";

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
    session: ISessionConfig;
}

export interface IServerAppConfig {
    env: string;
    log: ILogConfig;
    version: { app: string; api: string };
    regenerateSchema: boolean;
    database: IDatabaseConfig;
    port: number;
    http2?: boolean;
    ssl?: { key: string, cert: string }
    dir: {
        root: string;
        upload: string;
        html: string;
        log: string;
    };
    security: ISecurityConfig;
}

let env = process.env;

let adminConfig: IAdminConfig;
try {
    adminConfig = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
} catch (err) {
    adminConfig = {
        logLevel: env.LOG_LEVEL,
        monitoring: false,
        samplingInterval: 0
    };
    fs.writeFileSync(__dirname + '/config.json', JSON.stringify(adminConfig));
    console.error(err);
}

export const config: IServerAppConfig = {
    env: env.NODE_ENV,
    log: {
        level: adminConfig.logLevel,
        dir: '/log'
    },
    version: {
        app: '0.1.0',
        api: 'v1'
    },
    regenerateSchema: true,
    http2: false,
    ssl: {
        key: '/ssl/server.key',
        cert: '/ssl/server.crt'
    },
    database: <IDatabaseConfig>{
        protocol: env.ADB_PROTOCOL,
        host: env.ADB_HOST,
        port: +env.ADB_PORT,
        user: env.ADB_USERNAME,
        password: env.ADB_PASSWORD,
        database: env.ADB_NAME
    },
    dir: {
        root: dirname(__dirname),
        upload: '/upload',
        html: '../www',
        log: '/log'
    },
    port: env.PORT,
    security: {
        secret: env.SECRET_KEY,
        salt: env.SALT,
        hashing: 'sha256',
        guestRoleName: 'guest',
        rootRoleName: 'root',
        session: {
            maxAge: 0,
            idPrefix: 'sess:',
            hashing: 'HS256',
            database: <IDatabaseConfig>{
                protocol: env.SDB_PROTOCOL,
                host: env.SDB_HOST,
                port: +env.SDB_PORT
            }
        }
    }
};
