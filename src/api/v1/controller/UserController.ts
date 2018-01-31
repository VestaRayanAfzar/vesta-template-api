import { join } from "path";
import { Response, Router } from "express";
import { IUser, User } from "../../../cmn/models/User";
import { FileUploader } from "../../../helpers/FileUploader";
import { AclAction } from "../../../cmn/enum/Acl";
import { IRole } from "../../../cmn/models/Role";
import { Hashing } from "../../../helpers/Hashing";
import { BaseController, IExtRequest } from "../../BaseController";
import { DatabaseError, Err, ValidationError } from "../../../medium";


export class UserController extends BaseController {

    public route(router: Router) {
        router.get('/user/count', this.checkAcl('user', AclAction.Read), this.wrap(this.getUserCount));
        router.get('/user/:id', this.checkAcl('user', AclAction.Read), this.wrap(this.getUser));
        router.get('/user', this.checkAcl('user', AclAction.Read), this.wrap(this.getUsers));
        router.post('/user', this.checkAcl('user', AclAction.Add), this.wrap(this.addUser));
        router.put('/user', this.checkAcl('user', AclAction.Edit), this.wrap(this.updateUser));
        router.delete('/user/:id', this.checkAcl('user', AclAction.Delete), this.wrap(this.removeUser));
        router.post('/user/file/:id', this.checkAcl('user', AclAction.Edit), this.wrap(this.upload));
    }

    public async getUserCount(req: IExtRequest, res: Response) {
        let query = this.query2vql(User, req.query, true);
        let result = await User.count(query);
        res.json(result)
    }

    public async getUser(req: IExtRequest, res: Response) {
        let authUser = this.getUserFromSession(req);
        let isAdmin = this.isAdmin(authUser);
        let id = isAdmin ? this.retrieveId(req) : authUser.id;
        let result = await User.find<IUser>(id, { relations: ['role'] });
        if (result.items.length == 1) {
            delete result.items[0].password;
            return res.json(result);
        }
        throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
    }

    public async getUsers(req: IExtRequest, res: Response) {
        let authUser = this.getUserFromSession(req);
        let isAdmin = this.isAdmin(authUser);
        if (!isAdmin) {
            throw new Err(Err.Code.Forbidden);
        }
        let query = this.query2vql(User, req.query, false, true);
        let result = await User.find<IUser>(query);
        for (let i = result.items.length; i--;) {
            delete result.items[i].password;
        }
        res.json(result);
    }

    public async addUser(req: IExtRequest, res: Response) {
        let authUser = this.getUserFromSession(req);
        let isAdmin = this.isAdmin(authUser);
        if (!isAdmin) {
            throw new Err(Err.Code.Forbidden);
        }
        let user = new User(req.body);
        let validationError = user.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        user.password = Hashing.withSalt(user.password);
        let result = await user.insert<IUser>();
        delete result.items[0].password;
        res.json(result)
    }

    public async updateUser(req: IExtRequest, res: Response) {
        let authUser = this.getUserFromSession(req);
        let isAdmin = this.isAdmin(authUser);
        let user = new User(req.body);
        if (!isAdmin) {
            user.id = authUser.id;
            user.role = +(<IRole>authUser.role).id;
            user.type = authUser.type;
        }
        let validationError = user.validate();
        if (validationError) {
            // user may not wanna update the password
            if (!user.password) {
                delete validationError.password;
                delete user.password;
            }
            if (Object.keys(validationError).length) {
                throw new ValidationError(validationError);
            }
        }
        if (user.password) {
            user.password = Hashing.withSalt(user.password);
        }
        let result = await User.find<IUser>(user.id);
        if (result.items.length == 1) {
            let uResult = await user.update<IUser>();
            delete uResult.items[0].password;
            res.json(uResult);
        } else {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
    }

    public async removeUser(req: IExtRequest, res: Response) {
        // right now, it's not possible to delete user
        throw new Err(Err.Code.Forbidden);
    }

    public async upload(req: IExtRequest, res: Response) {
        let id = +req.params.id;
        if (isNaN(id)) {
            throw new ValidationError({ id: 'number' });
        }
        let user: User;
        let destDirectory = join(this.config.dir.upload, 'user');
        let result = await User.find<IUser>(id);
        if (result.items.length != 1) {
            throw new Err(Err.Code.WrongInput);
        }
        user = new User(result.items[0]);
        let uploader = new FileUploader<IUser>(destDirectory);
        let upl = await uploader.upload(req);
        let oldFileName = user.image;
        user.image = upl.image;
        await FileUploader.checkAndDeleteFile(`${destDirectory}/${oldFileName}`);
        let uResult = await user.update<IUser>();
        delete uResult.items[0].password;
        res.json(uResult);
    }
}