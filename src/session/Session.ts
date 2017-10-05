import * as uuid from "node-uuid";
import {ISessionConfig} from "../config/config";
import {Logger} from "../helpers/Logger";
import {JWT} from "../helpers/JWT";
import {Response} from "express";
import {KeyValueDatabase} from "@vesta/core";
import {Redis} from "@vesta/driver-redis";

export interface ISessionData {
    payload: any;
    meta: {
        id: string;
        lastTime: number;
        // remember me
        persist?: boolean;
    }
}

export class Session {
    private static config: ISessionConfig;
    private static db: KeyValueDatabase;
    public sessionId: string;
    public isExpired = false;
    public sessionData: ISessionData;

    constructor(data: ISessionData, persist?: boolean) {
        let {maxAge, idPrefix} = Session.config;
        let now = Date.now();
        if (data) {
            // restoring session
            if (!data.meta.persist && maxAge && now - data.meta.lastTime > maxAge) {
                this.isExpired = true;
            } else {
                data.meta.lastTime = now;
            }
            this.sessionData = data;
        } else {
            // creating new session
            this.sessionData = {
                payload: {},
                meta: {
                    id: idPrefix + uuid.v4(),
                    lastTime: now,
                    persist: persist
                }
            }
        }
        this.sessionId = this.sessionData.meta.id;
    }

    public static init(config: ISessionConfig) {
        Session.config = config;
        return new Redis(Session.config.database).connect()
            .then(connection => {
                Session.db = connection;
            })
    }

    public set(name: string, value: any) {
        this.sessionData.payload[name] = value;
        Session.db.insert(this.sessionId, JSON.stringify(this.sessionData)).catch(err => console.log(err.message));
    }

    public get<T>(name: string) {
        return this.sessionData.payload ? <T>this.sessionData.payload[name] : null;
    }

    public remove(name: string) {
        let value = this.sessionData.payload[name];
        delete this.sessionData.payload[name];
        Session.db.insert(this.sessionId, JSON.stringify(this.sessionData)).catch(err => console.log(err.message));
        return value;
    }

    public destroy() {
        this.sessionData = <ISessionData>{};
        Session.db.insert(this.sessionId, '').catch(err => console.log(err.message));
    }

    public static create(persist?: boolean): Promise<Session> {
        let session = new Session(null, persist);
        return Session.db.insert(session.sessionId, JSON.stringify(session.sessionData))
            .then(() => session);
    }

    public static restore(sessionId: string): Promise<Session> {
        return Session.db.find<ISessionData>(sessionId)
            .then(data => {
                if (data.items.length) {
                    let session = new Session(data.items[0]);
                    if (session.isExpired) {
                        Logger.getInstance().warn(`Session Expired {ID: "${session.sessionId}", PAYLOAD: ${JSON.stringify(session.sessionData.payload)}}`);
                        session.destroy();
                        return null;
                    }
                    return session;
                }
                return null;
            }).catch(err => null);
    }

    public static setAuthToken(res: Response, sessionId: string, token?: string) {
        token = token || JWT.sign({sessionId});
        res.set('X-Auth-Token', token);
    }
}
