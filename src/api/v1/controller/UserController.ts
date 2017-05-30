import * as path from "path";
import {Response, Router, NextFunction} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {User, IUser} from "../../../cmn/models/User";
import {Permission} from "../../../cmn/models/Permission";
import {FileUploader} from "../../../helpers/FileUploader";
import {Vql, ValidationError, DatabaseError, Err} from "@vesta/core";


export class UserController extends BaseController {

    public route(router: Router) {
        router.get('/user/count', this.checkAcl('user', Permission.Action.Read), this.wrap(this.getUserCount));
        router.get('/user/:id', this.checkAcl('user', Permission.Action.Read), this.wrap(this.getUser));
        router.get('/user', this.checkAcl('user', Permission.Action.Read), this.wrap(this.getUsers));
        router.post('/user', this.checkAcl('user', Permission.Action.Add), this.wrap(this.addUser));
        router.put('/user', this.checkAcl('user', Permission.Action.Edit), this.wrap(this.updateUser));
        router.delete('/user/:id', this.checkAcl('user', Permission.Action.Delete), this.wrap(this.removeUser));
        router.post('/user/file/:id', this.checkAcl('user', Permission.Action.Edit), this.wrap(this.upload));
    }

    protected init() {
    }

    public async getUserCount(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(User.schema.name);
        let filter = req.query.query;
        if (filter) {
            let user = new User(filter);
            let validationError = query && user.validate(...Object.keys(filter));
            if (validationError) {
                throw new ValidationError(validationError);
            }
            query.filter(filter);
        }
        let result = await User.count(query);
        res.json(result)
    }

    public async getUser(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(User.schema.name);
        query.filter({id: req.params.id}).fetchRecordFor('roleGroups');
        let result = await User.find<IUser>(query);
        if (result.items.length == 1) {
            delete result.items[0].password;
            res.json(result);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }

    public async getUsers(req: IExtRequest, res: Response, next: NextFunction) {
        let query = new Vql(User.schema.name);
        let filter = req.query.query;
        if (filter) {
            let user = new User(filter);
            let validationError = query && user.validate(...Object.keys(filter));
            if (validationError) {
                throw new ValidationError(validationError)
            }
            query.filter(filter);
        }
        query.limitTo(Math.min(+req.query.limit || this.MAX_FETCH_COUNT, this.MAX_FETCH_COUNT)).fromPage(+req.query.page || 1);
        if (req.query.orderBy) {
            let orderBy = req.query.orderBy[0];
            query.sortBy(orderBy.field, orderBy.ascending == 'true');
        }
        let result = await User.find<IUser>(query);
        for (let i = result.items.length; i--;) {
            delete result.items[i].password;
        }
        res.json(result);
    }

    public async addUser(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User(req.body),
            validationError = user.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await user.insert<IUser>();
        res.json(result)
    }

    public async updateUser(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User(req.body),
            validationError = user.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await User.find<IUser>(user.id);
        if (result.items.length == 1) {
            let uResult = await user.update<IUser>();
            delete result.items[0].password;
            res.json(uResult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }

    public async removeUser(req: IExtRequest, res: Response, next: NextFunction) {
        let user = new User({id: req.params.id});
        let result = await user.remove();
        res.json(result)
    }

    public async upload(req: IExtRequest, res: Response, next: NextFunction) {
        let user: User;
        let destDirectory = path.join(this.setting.dir.upload, 'user');
        let result = await User.find<IUser>(+req.params.id);
        if (result.items.length != 1) throw new Err(Err.Code.DBRecordCount, 'User not found');
        delete result.items[0].password;
        user = new User(result.items[0]);
        let uploader = new FileUploader<IUser>(destDirectory);
        let upl = await uploader.upload(req);
        let oldFileName = user.image;
        user.image = upl.image;
        if (oldFileName && oldFileName != '') {
            await FileUploader.checkAndDeleteFile(`${destDirectory}/${oldFileName}`);
        }
        let uResult = await user.update({image: user.image});
        res.json(uResult);
    }
}