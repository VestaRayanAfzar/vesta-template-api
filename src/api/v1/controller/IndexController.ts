import { Err, ValidationError } from "@vesta/core";
import { Culture } from "@vesta/culture";
import { NextFunction, Response, Router } from "express";
import { access } from "fs";
import { NotificationType } from "../../../cmn/models/Notification";
import { NotificationService } from "../../../helpers/NotificationService";
import { BaseController, IExtRequest } from "../../BaseController";

export class IndexController extends BaseController {

    public route(router: Router): void {
        router.get("/", this.wrap(this.sayHi));
        router.get("/notif", this.wrap(this.sendNotif));
        router.get("/lang/:locale", this.wrap(this.getLanguage));
        router.get("/lang", this.wrap(this.getLanguage));
        router.put("/locale/:locale", this.wrap(this.setLocale));
    }

    private async sayHi(req: IExtRequest, res: Response, next: NextFunction) {
        res.json({
            poweredBy: "Vesta",
            version: this.config.version,
            echo: {
                params: req.params,
                query: req.query,
                body: req.body,
            },
            // you: {
            //     agent: req.headers["user-agent"],
            //     cookie: req.cookies,
            //     ip: req.headers["X-Real-IP"] || req.ip,
            // },
        });
    }

    private async sendNotif(req: IExtRequest, res: Response, next: NextFunction) {
        const notification = await NotificationService.getInstance().notif("Testing", NotificationType.Sent);
        res.json({ notification });
    }

    private async getLanguage(req: IExtRequest, res: Response, next: NextFunction) {
        let langCode = req.params.locale;
        if (!langCode) {
            langCode = Culture.getLocale().code;
        }
        langCode = langCode.split("-")[1];
        langCode = `${langCode[0].toUpperCase()}${langCode[1].toLowerCase()}`;
        const lngPath = `${this.config.dir.root}/cmn/vocabs/${langCode}Vocabs.js`;
        access(lngPath, (error) => {
            if (error) {
                return next(new Err(Err.Code.NotAllowed, `Invalid language: ${langCode}`));
            }
            const vocabs = require(lngPath);
            res.json({ items: [vocabs[`${langCode}Vocabs`]] });
        });
    }

    private async setLocale(req: IExtRequest, res: Response, next: NextFunction) {
        let code = req.params.locale as string;
        if (!code || !code.match(/^[a-z]{2}-[a-z]{2}$/i)) {
            return next(new ValidationError({ locale: "invalid" }));
        }
        const [lang, country] = code.split("-");
        code = [lang.toLocaleLowerCase(), country.toUpperCase()].join("-");
        Culture.setDefault(code);
        const locale = Culture.getLocale();
        const user = this.getUserFromSession(req);
        if (user.id) {
            await user.update({ locale: locale.code });
        }
        return this.getLanguage(req, res, next);
    }

    
}
