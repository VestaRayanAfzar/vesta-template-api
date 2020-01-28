import { DatabaseError, Err, sanitizePhoneNumber, ValidationError } from "@vesta/core";
import { AclAction } from "@vesta/services";
import { Response, Router } from "express";
import { join } from "path";
import { IRole } from "../../../cmn/models/Role";
import { IUser, User } from "../../../cmn/models/User";
import { FileUploader } from "../../../helpers/FileUploader";
import { Hashing } from "../../../helpers/Hashing";
import { BaseController, IExtRequest } from "../../BaseController";

export class UserController extends BaseController {
    public route(router: Router) {
        router.get("/user/count", this.checkAcl("user", AclAction.Read), this.wrap(this.getUserCount));
        router.get("/user/:id", this.checkAcl("user", AclAction.Read), this.wrap(this.getUser));
        router.get("/user", this.checkAcl("user", AclAction.Read), this.wrap(this.getUsers));
        router.post("/user", this.checkAcl("user", AclAction.Add), this.wrap(this.addUser));
        router.put("/user", this.checkAcl("user", AclAction.Edit), this.wrap(this.updateUser));
        router.delete("/user/:id", this.checkAcl("user", AclAction.Delete), this.wrap(this.removeUser));
        router.post("/user/file/:id", this.checkAcl("user", AclAction.Edit), this.wrap(this.upload));
    }

    public async getUserCount(req: IExtRequest, res: Response) {
        const query = this.query2vql(User, req.query, true);
        const result = await User.count(query);
        res.json(result);
    }

    public async getUser(req: IExtRequest, res: Response) {
        const authUser = this.getAuthUser(req);
        const isAdmin = this.isAdmin(authUser);
        const id = isAdmin ? this.retrieveId(req) : authUser.id;
        const result = await User.find<IUser>(id, { relations: ["role"] });
        if (result.items.length === 1) {
            delete result.items[0].password;
            return res.json(result);
        }
        throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
    }

    public async getUsers(req: IExtRequest, res: Response) {
        const authUser = this.getAuthUser(req);
        const isAdmin = this.isAdmin(authUser);

        if (!isAdmin) {
            throw new Err(Err.Code.Forbidden);
        }
        const query = this.query2vql(User, req.query, false, true);
        const result = await User.find<IUser>(query);
        for (let i = result.items.length; i--; ) {
            delete result.items[i].password;
        }
        res.json(result);
    }

    public async addUser(req: IExtRequest, res: Response) {
        const authUser = this.getAuthUser(req);
        const isAdmin = this.isAdmin(authUser);
        if (!isAdmin) {
            throw new Err(Err.Code.Forbidden);
        }
        const user = new User(req.body);
        if (user.mobile) {
            user.mobile = sanitizePhoneNumber(user.mobile);
        }
        const validationError = user.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        user.password = Hashing.withSalt(user.password);
        const result = await user.insert<IUser>();
        delete result.items[0].password;
        res.json(result);
    }

    public async updateUser(req: IExtRequest, res: Response) {
        const authUser = this.getAuthUser(req);
        const isAdmin = this.isAdmin(authUser);
        const user = new User(req.body);
        user.mobile = user.mobile ? sanitizePhoneNumber(user.mobile) : null;
        if (!isAdmin) {
            user.id = authUser.id;
            user.role = +(authUser.role as IRole).id;
            user.type = authUser.type;
        }
        const validationError = user.validate();
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
        const result = await User.find<IUser>(user.id);
        if (result.items.length === 1) {
            const uResult = await user.update<IUser>();
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
        const id = this.retrieveId(req);
        let user: User;
        const destDirectory = join(this.config.dir.upload, "user");
        const result = await User.find<IUser>(id);
        if (result.items.length !== 1) {
            throw new Err(Err.Code.NotAllowed);
        }
        user = new User(result.items[0]);
        const uploader = new FileUploader<IUser>(true);
        await uploader.parse(req);
        const upl = await uploader.upload(destDirectory);
        const oldFileName = user.image;
        user.image = upl.image;
        if (oldFileName) {
            await FileUploader.checkAndDeleteFile(`${destDirectory}/${oldFileName}`);
        }
        const uResult = await user.update<IUser>();
        delete uResult.items[0].password;
        res.json(uResult);
    }
}
