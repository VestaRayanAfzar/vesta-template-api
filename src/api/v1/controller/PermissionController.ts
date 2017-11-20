import {NextFunction, Response, Router} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {IPermission, Permission} from "../../../cmn/models/Permission";
import {DatabaseError} from "../../../cmn/core/error/DatabaseError";
import {Err} from "../../../cmn/core/Err";
import {ValidationError} from "../../../cmn/core/error/ValidationError";
import {AclAction} from "../../../cmn/enum/Acl";


export class PermissionController extends BaseController {

    public route(router: Router) {
        router.get('/acl/permission/:id', this.checkAcl('acl.permission', AclAction.Read), this.wrap(this.getPermission));
        router.get('/acl/permission', this.checkAcl('acl.permission', AclAction.Read), this.wrap(this.getPermissions));
        router.put('/acl/permission', this.checkAcl('acl.permission', AclAction.Edit), this.wrap(this.updatePermission));
    }

    public async getPermission(req: IExtRequest, res: Response, next: NextFunction) {
        let id = this.retrieveId(req);
        let result = await Permission.find<IPermission>(id);
        res.json(result);
    }

    public async getPermissions(req: IExtRequest, res: Response, next: NextFunction) {
        let query = this.query2vql(Permission, req.query, false, true);
        // removing limit
        delete query.limit;
        let result = await Permission.find(query);
        res.json(result);
    }

    public async updatePermission(req: IExtRequest, res: Response, next: NextFunction) {
        let permission = new Permission(req.body);
        let validationError = permission.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await Permission.find<IPermission>(permission.id);
        if (result.items.length == 1) {
            result.items[0].status = permission.status;
            permission.setValues(result.items[0]);
            let pResult = await permission.update();
            await this.acl.initAcl();
            res.json(pResult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }
}