import { Culture } from "@vesta/culture";
import { NextFunction, Response } from "express";
import { IExtRequest } from "../api/BaseController";
import { User } from "../cmn/models/User";

export function localeMiddleware(req: IExtRequest, res: Response, next: NextFunction) {
    const user = new User(req.session.get("user"));
    if (user.locale) {
        Culture.setDefault(user.locale);
    }
    next();
}
