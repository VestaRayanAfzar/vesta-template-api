import { KeyValueDatabase } from "@vesta/core";
import { Redis } from "@vesta/driver-redis";
import { Response } from "express";
import { v4 } from "uuid";
import { ISessionConfig } from "../helpers/Config";
import { JWT } from "../helpers/JWT";

export interface ISessionData {
    payload: any;
    meta: {
        id: string;
        lastTime: number;
        // remember me
        persist?: boolean;
    };
}

export class Session {

    public static init(config: ISessionConfig) {
        Session.config = config;
        return new Redis(Session.config.database).connect()
            .then((connection) => {
                Session.db = connection;
            });
    }

    public static create(persist?: boolean): Promise<Session> {
        const session = new Session(null, persist);
        return Session.db.insert(session.sessionId, JSON.stringify(session.sessionData))
            .then(() => session);
    }

    public static restore(sessionId: string): Promise<Session> {
        return Session.db.find<ISessionData>(sessionId)
            .then((data) => {
                if (data.items.length) {
                    const session = new Session(data.items[0] as ISessionData);
                    if (session.isExpired) {
                        session.destroy();
                        return null;
                    }
                    return session;
                }
                return null;
            }).catch((err) => null);
    }

    public static setAuthToken(res: Response, sessionId: string, token?: string) {
        token = token || JWT.sign({ sessionId });
        res.set("X-Auth-Token", token);
    }

    private static config: ISessionConfig;
    private static db: KeyValueDatabase;
    public sessionId: string;
    public isExpired = false;
    public sessionData: ISessionData;

    constructor(data: ISessionData, persist?: boolean) {
        const { maxAge, idPrefix } = Session.config;
        const now = Date.now();
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
                meta: { id: idPrefix + v4(), lastTime: now, persist },
                payload: {},
            };
        }
        this.sessionId = this.sessionData.meta.id;
        // saving updated session
        Session.db.insert(this.sessionId, JSON.stringify(this.sessionData))
            // tslint:disable-next-line:no-console
            .catch((err) => console.log(err.message));
    }

    public set(name: string, value: any) {
        this.sessionData.payload[name] = value;
        Session.db.insert(this.sessionId, JSON.stringify(this.sessionData))
            // tslint:disable-next-line:no-console
            .catch((err) => console.log(err.message));
    }

    public get<T>(name: string) {
        return this.sessionData.payload ? this.sessionData.payload[name] as T : null;
    }

    public remove(name: string) {
        const value = this.sessionData.payload[name];
        delete this.sessionData.payload[name];
        Session.db.insert(this.sessionId, JSON.stringify(this.sessionData))
            // tslint:disable-next-line:no-console
            .catch((err) => console.log(err.message));
        return value;
    }

    public destroy() {
        this.sessionData = {} as ISessionData;
        Session.db.insert(this.sessionId, "")
            // tslint:disable-next-line:no-console
            .catch((err) => console.log(err.message));
    }
}
