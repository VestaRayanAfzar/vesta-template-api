import {NextFunction, Response, Router} from "express";
import {BaseController, IExtRequest} from "../../BaseController";

export class IndexController extends BaseController {

    public route(router: Router): void {
        router.get('/', this.sayHi.bind(this));
    }

    private sayHi(req: IExtRequest, res: Response, next: NextFunction) {
        res.json({poweredBy: 'Vesta Platform', message: `Welcome to V${this.setting.version.app}`});
    }
}