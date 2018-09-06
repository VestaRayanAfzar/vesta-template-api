import { Err } from "@vesta/core";
import { NextFunction, Response, Router } from "express";
import { access } from "fs";
import { BaseController, IExtRequest } from "../../BaseController";

export class IndexController extends BaseController {

    public route(router: Router): void {
        router.get("/", this.wrap(this.sayHi));
        router.get("/lang/:lng", this.wrap(this.getLanguage));
    }

    private async sayHi(req: IExtRequest, res: Response, next: NextFunction) {
        res.json({
            poweredBy: "Vesta",
            version: this.config.version,
            you: { ip: req.headers["X-Real-IP"] || req.ip, agent: req.headers["user-agent"] },
        });
    }

    private async getLanguage(req: IExtRequest, res: Response, next: NextFunction) {
        const lng = req.params.lng;
        const lngPath = `${this.config.dir.root}/cmn/locale/${lng}/Dictionary.js`;
        access(lngPath, (error) => {
            if (error) { return next(new Err(Err.Code.WrongInput, `Invalid language: ${lng}`)); }
            res.json({ dictionary: require(lngPath).Dictionary });
        });
    }
}
