import { NextFunction, Response, Router } from "express";
import { BaseController, IExtRequest } from "../../BaseController";
import { Context, IContext } from "../../../cmn/models/Context";
import { AclAction } from "../../../cmn/enum/Acl";
import { ValidationError, DatabaseError, Err } from "../../../medium";

export class ContextController extends BaseController {

    public route(router: Router) {
        router.get('/context/count', this.checkAcl('context', AclAction.Read), this.wrap(this.getContextCount));
        router.get('/context/:id', this.checkAcl('context', AclAction.Read), this.wrap(this.getContext));
        router.get('/context', this.checkAcl('context', AclAction.Read), this.wrap(this.getContexts));
        router.post('/context', this.checkAcl('context', AclAction.Add), this.wrap(this.addContext));
        router.put('/context', this.checkAcl('context', AclAction.Edit), this.wrap(this.updateContext));
        router.delete('/context/:id', this.checkAcl('context', AclAction.Delete), this.wrap(this.removeContext));
    }

    public async getContextCount(req: IExtRequest, res: Response, next: NextFunction) {
        let query = this.query2vql(Context, req.query, true);
        let result = await Context.count(query);
        res.json(result);
    }

    public async getContext(req: IExtRequest, res: Response, next: NextFunction) {
        let id = +req.params.id;
        if (isNaN(id)) {
            throw new ValidationError({ id: 'number' });
        }
        let result = await Context.find<IContext>(id);
        if (result.items.length != 1) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        res.json(result);
    }

    public async getContexts(req: IExtRequest, res: Response, next: NextFunction) {
        let query = this.query2vql(Context, req.query);
        let result = await Context.find(query);
        res.json(result);
    }

    public async addContext(req: IExtRequest, res: Response, next: NextFunction) {
        let context = new Context(req.body);
        let validationError = context.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await context.insert<IContext>();
        res.json(result);
    }

    public async updateContext(req: IExtRequest, res: Response, next: NextFunction) {
        let context = new Context(req.body);
        let validationError = context.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await Context.find<IContext>(context.id);
        if (result.items.length != 1) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        let uResult = await context.update<IContext>();
        res.json(uResult);
    }

    public async removeContext(req: IExtRequest, res: Response, next: NextFunction) {
        let id = +req.params.id;
        if (isNaN(id)) {
            throw new ValidationError({ id: 'number' });
        }
        let context = new Context({ id });
        let result = await context.remove();
        res.json(result);
    }
}
