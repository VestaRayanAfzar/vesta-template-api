import { NextFunction, Response } from "express";
import { IExtRequest } from "../api/BaseController";
import { JWT } from "../helpers/JWT";
import { Session } from "../session/Session";

export function sessionMiddleware(req: IExtRequest, res: Response, next: NextFunction) {
    const token = req.get("X-Auth-Token");
    // if (!token) { return next(new Err(Err.Code.Unauthorized)); }
    if (!token) { return newSession(); }
    JWT.verify(token, (err, payload: any) => {
        if (err) {
            // return next(new Err(Err.Code.Token));
            return newSession();
        }
        restoreSession(payload.sessionId);
    });

    function newSession() {
        Session.create()
            .then((session) => {
                // console.log('new session created', session.sessionData);
                Session.setAuthToken(res, session.sessionId);
                req.session = session;
                next();
            });
    }

    function restoreSession(sessionId: string) {
        Session.restore(sessionId)
            .then((session) => {
                if (!session) {
                    // session has been expired
                    return newSession();
                }
                // console.log('session verified', session.sessionData);
                Session.setAuthToken(res, null, token);
                req.session = session;
                next();
            });
    }
}
