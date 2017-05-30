import {Response, Router, NextFunction} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {Permission, IPermission} from "../../../cmn/models/Permission";
import {Vql, ValidationError, DatabaseError, Err} from "@vesta/core";
import {throws} from "assert";


export class PermissionController extends BaseController {

    public route(router: Router) {
        router.get('/acl/permission/:id', this.checkAcl('acl.permission', Permission.Action.Read), this.wrap(this.getPermission));
        router.get('/acl/permission', this.checkAcl('acl.permission', Permission.Action.Read), this.wrap(this.getPermissions));
        router.put('/acl/permission', this.checkAcl('acl.permission', Permission.Action.Edit), this.wrap(this.updatePermission));
    }

    protected init() {
    }

    public async getPermission(req: IExtRequest, res: Response, next: NextFunction) {
        let result = await Permission.find<IPermission>(req.params.id);
        res.json(result);
    }

    public async getPermissions(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(Permission.schema.name);
        let filter = req.query.query;
        if (filter) {
            let permission = new Permission(filter);
            let validationError = query && permission.validate(...Object.keys(filter));
            if (validationError) {
                throw new ValidationError(validationError);
            }
            query.filter(filter);
        }
        let result = await Permission.find(query);
        res.json(result);
    }

    public async updatePermission(req: IExtRequest, res: Response, next: NextFunction) {
        let permission = new Permission(req.body),
            validationError = permission.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await Permission.find<IPermission>(permission.id);
        if (result.items.length == 1) {
            result.items[0].status = permission.status;
            permission.setValues(result.items[0]);
            let presult = await permission.update();
            await this.acl.initAcl();
            res.json(presult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }
}