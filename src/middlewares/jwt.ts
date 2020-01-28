import { NextFunction, Response } from "express";
import { IExtRequest } from "../api/BaseController";
import { JWT } from "../helpers/JWT";

// if X-Auth-Token is exist then parse, verify and assign to to req.auth. Otherwise assign empty object to the req.auth
export function jwtMiddleware(req: IExtRequest, res: Response, next: NextFunction) {
    const token = req.get("X-Auth-Token");
    if (token) {
        JWT.verify(token, (err, payload: any) => {
            if (err) {
                next(err);
            } else {
                req.auth = payload;
                next();
            }
        });
    } else {
        // this is a guest user
        req.auth = {};
        next();
    }
}
