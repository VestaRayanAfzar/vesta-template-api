import {exists} from "fs";
import {NextFunction, Response, Router} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Err} from "../../../cmn/core/Err";

export class IndexController extends BaseController {

    public route(router: Router): void {
        router.get('/', this.wrap(this.sayHi));
        router.get('/lang/:lng', this.wrap(this.getLanguage));
    }

    private async sayHi(req: IExtRequest, res: Response, next: NextFunction) {
        res.json({poweredBy: 'Vesta Platform', message: `Welcome to V${this.config.version.app}`});
    }

    private async getLanguage(req: IExtRequest, res: Response, next: NextFunction) {
        let lng = req.params.lng;
        let lngPath = `${this.config.dir.root}/cmn/locale/${lng}/Dictionary.js`;
        exists(lngPath, exists => {
            if (!exists) return next(new Err(Err.Code.WrongInput, `Invalid language: ${lng}`));
            res.json({dictionary: require(lngPath).Dictionary});
        })
    }
}