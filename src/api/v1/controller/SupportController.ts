import { DatabaseError, Err, ValidationError } from "@vesta/core";
import { AclAction } from "@vesta/services";
import { NextFunction, Response, Router } from "express";
import { ISupport, Support } from "../../../cmn/models/Support";
import { BaseController, IExtRequest } from "../../BaseController";

export class SupportController extends BaseController {
    public route(router: Router) {
        router.get("/support/count", this.checkAcl("support", AclAction.Read), this.wrap(this.getSupportCount));
        router.get("/support/:id", this.checkAcl("support", AclAction.Read), this.wrap(this.getSupport));
        router.get("/support", this.checkAcl("support", AclAction.Read), this.wrap(this.getSupports));
        router.post("/support", this.checkAcl("support", AclAction.Add), this.wrap(this.addSupport));
        router.put("/support", this.checkAcl("support", AclAction.Edit), this.wrap(this.updateSupport));
        router.delete("/support/:id", this.checkAcl("support", AclAction.Delete), this.wrap(this.removeSupport));
    }

    public async getSupportCount(req: IExtRequest, res: Response, next: NextFunction) {
        const query = this.query2vql(Support, req.query, true);
        const result = await Support.count(query);
        res.json(result);
    }

    public async getSupport(req: IExtRequest, res: Response, next: NextFunction) {
        const id = this.retrieveId(req);
        const result = await Support.find<ISupport>(id);
        if (result.items.length !== 1) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        res.json(result);
    }

    public async getSupports(req: IExtRequest, res: Response, next: NextFunction) {
        const query = this.query2vql(Support, req.query);
        const result = await Support.find(query);
        res.json(result);
    }

    public async addSupport(req: IExtRequest, res: Response, next: NextFunction) {
        const authUser = this.getAuthUser(req);
        const support = new Support(req.body);
        support.date = Date.now();
        support.name = authUser.username;
        if (!support.phone) {
            support.phone = authUser.mobile;
        }
        const validationError = support.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        const result = await Support.insert<ISupport>();
        res.json(result);
    }

    public async updateSupport(req: IExtRequest, res: Response, next: NextFunction) {
        const support = new Support(req.body);
        const validationError = support.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        const result = await Support.find<ISupport>(support.id);
        if (result.items.length !== 1) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        const uResult = await support.update<ISupport>();
        res.json(uResult);
    }

    public async removeSupport(req: IExtRequest, res: Response, next: NextFunction) {
        const id = this.retrieveId(req);
        const support = new Support({ id });
        const result = await support.remove();
        res.json(result);
    }
}
