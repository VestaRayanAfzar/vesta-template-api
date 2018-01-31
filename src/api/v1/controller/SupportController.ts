import { NextFunction, Response, Router } from "express";
import { AclAction } from "../../../cmn/enum/Acl";
import { BaseController, IExtRequest } from "../../BaseController";
import { Support, ISupport } from "../../../cmn/models/Support";
import { DatabaseError, Err, ValidationError } from "../../../medium";

export class SupportController extends BaseController {

    public route(router: Router) {
        router.get('/support/count', this.checkAcl('support', AclAction.Read), this.wrap(this.getSupportCount));
        router.get('/support/:id', this.checkAcl('support', AclAction.Read), this.wrap(this.getSupport));
        router.get('/support', this.checkAcl('support', AclAction.Read), this.wrap(this.getSupports));
        router.post('/support', this.checkAcl('support', AclAction.Add), this.wrap(this.addSupport));
        router.put('/support', this.checkAcl('support', AclAction.Edit), this.wrap(this.updateSupport));
        router.delete('/support/:id', this.checkAcl('support', AclAction.Delete), this.wrap(this.removeSupport));
    }

    public async getSupportCount(req: IExtRequest, res: Response, next: NextFunction) {
        let query = this.query2vql(Support, req.query, true);
        let result = await Support.count(query);
        res.json(result);
    }

    public async getSupport(req: IExtRequest, res: Response, next: NextFunction) {
        let id = this.retrieveId(req);
        let result = await Support.find<ISupport>(id);
        if (result.items.length != 1) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        res.json(result);
    }

    public async getSupports(req: IExtRequest, res: Response, next: NextFunction) {
        let query = this.query2vql(Support, req.query);
        let result = await Support.find(query);
        res.json(result);
    }

    public async addSupport(req: IExtRequest, res: Response, next: NextFunction) {
        let authUser = this.getUserFromSession(req);
        let support = new Support(req.body);
        support.date = Date.now();
        support.name = authUser.username;
        if (!support.phone) {
            support.phone = authUser.mobile;
        }
        let validationError = support.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await Support.insert<ISupport>();
        res.json(result);
    }

    public async updateSupport(req: IExtRequest, res: Response, next: NextFunction) {
        let support = new Support(req.body);
        let validationError = support.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await Support.find<ISupport>(support.id);
        if (result.items.length != 1) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        let uResult = await support.update<ISupport>();
        res.json(uResult);
    }

    public async removeSupport(req: IExtRequest, res: Response, next: NextFunction) {
        let id = this.retrieveId(req);
        let support = new Support({ id });
        let result = await support.remove();
        res.json(result);
    }
}
