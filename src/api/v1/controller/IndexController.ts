import { access } from "fs";
import { NextFunction, Response, Router } from "express";
import { BaseController, IExtRequest } from "../../BaseController";
import { Err } from "../../../medium";

export class IndexController extends BaseController {

    public route(router: Router): void {
        router.get('/', this.wrap(this.sayHi));
        router.get('/lang/:lng', this.wrap(this.getLanguage));
    }

    private async sayHi(req: IExtRequest, res: Response, next: NextFunction) {
        res.json({
            poweredBy: 'Vesta',
            version: this.config.version,
            you: { ip: req.headers['X-Real-IP'] || req.ip, agent: req.headers['user-agent'] }
        });
    }

    private async getLanguage(req: IExtRequest, res: Response, next: NextFunction) {
        let lng = req.params.lng;
        let lngPath = `${this.config.dir.root}/cmn/locale/${lng}/Dictionary.js`;
        access(lngPath, error => {
            if (error) return next(new Err(Err.Code.WrongInput, `Invalid language: ${lng}`));
            res.json({ dictionary: require(lngPath).Dictionary });
        })
    }
}