import { Err, ValidationError } from "@vesta/core";
import { LogLevel } from "@vesta/services";
import { NextFunction, Response, Router } from "express";
import { IRole, Role } from "../../../cmn/models/Role";
import { IUser, SourceApp, User, UserType } from "../../../cmn/models/User";
import { Hashing } from "../../../helpers/Hashing";
import { JWT } from "../../../helpers/JWT";
import { BaseController, IExtRequest } from "../../BaseController";

export class AccountController extends BaseController {

    public route(router: Router) {
        router.get("/me", this.wrap(this.getMe));
        router.post("/account", this.checkAcl("account", "register"), this.wrap(this.register));
        router.post("/account/login", this.checkAcl("account", "login"), this.wrap(this.login));
        router.post("/account/forget", this.checkAcl("account", "forget"), this.wrap(this.forget));
        router.get("/account/logout", this.checkAcl("account", "logout"), this.wrap(this.logout));
    }

    private async register(req: IExtRequest, res: Response, next: NextFunction) {
        let userExists = false;
        const sourceApp = +req.get("From");
        if (sourceApp !== SourceApp.EndUser) {
            throw new Err(Err.Code.Forbidden);
        }
        const userRoleName = this.config.security.userRoleName;
        let user = new User(req.body);
        const validationError = user.validate("username", "password");
        if (validationError) {
            throw new ValidationError(validationError);
        }
        // checking if user exists
        const existingUser = await User.find<IUser>({ username: user.username });
        if (existingUser.items.length > 1) {
            // todo something goes wrong
            for (let i = 1, il = existingUser.items.length; i < il; ++i) {
                const tmpUser = new User(existingUser.items[i]);
                try {
                    await tmpUser.remove();
                } catch (error) {
                    req.log(LogLevel.Error, error.message, "register", "AccountController");
                }
            }
        }
        if (existingUser.items.length > 0) {
            userExists = true;
            user = new User(existingUser.items[0]);
            if (user.isOfType(UserType.User)) {
                throw new Err(Err.Code.Forbidden, "err_already_registered");
            } else {
                user.type.push(UserType.User);
            }
        } else {
            user.password = Hashing.withSalt(user.password);
            user.type = [UserType.User];
        }
        const role = await Role.find<IRole>({ name: userRoleName } as IRole);
        if (!role.items.length) {
            throw new Err(Err.Code.Server, "err_no_role");
        }
        user.role = role.items[0].id;
        userExists ? await user.update<IUser>() : await user.insert<IUser>();
        return res.json({});
    }

    private async login(req: IExtRequest, res: Response, next: NextFunction) {
        const sourceApp = +req.get("From");
        if ([SourceApp.EndUser, SourceApp.Panel].indexOf(sourceApp) < 0) {
            throw new Err(Err.Code.NotAllowed);
        }
        const user = new User(req.body);
        const validationError = user.validate("username", "password");
        if (validationError) {
            throw new ValidationError(validationError);
        }
        user.password = Hashing.withSalt(user.password);
        const result = await User.find<IUser>({ username: user.username, password: user.password }, { relations: ["role"] });
        if (result.items.length !== 1) {
            throw new Err(Err.Code.DBNoRecord);
        }
        result.items[0].role = this.acl.updateRolePermissions(result.items[0].role as IRole);
        user.setValues(result.items[0]);
        // user.sourceApp = sourceApp;
        delete user.password;
        // prevent admin from logging into application
        if (this.isAdmin(user) && user.sourceApp !== SourceApp.Panel) {
            throw new Err(Err.Code.Forbidden, "err_admin_login");
        }
        // prevent other users from logging into panel
        if (sourceApp === SourceApp.Panel && !user.isOfType(UserType.Admin)) {
            throw new Err(Err.Code.Forbidden, "err_user_admin_login");
        }
        // prevent none user from logging into user app
        if (sourceApp === SourceApp.EndUser && !user.isOfType(UserType.User)) {
            throw new Err(Err.Code.Forbidden, "err_none_user_login");
        }
        const token = JWT.sign({ user: this.getUserDataForSigning(user) }, this.config.security.expireTime);
        res.json({ items: [user], token });
    }

    private async logout(req: IExtRequest, res: Response, next: NextFunction) {
        // TODO:: handling session close if exist or logs o
        req.auth = {};
        return this.getMe(req, res, next);
    }

    private async forget(req: IExtRequest, res: Response, next: NextFunction) {
        const sourceApp = +req.get("From");
        if ([SourceApp.EndUser, SourceApp.Panel].indexOf(sourceApp) < 0) {
            throw new Err(Err.Code.Forbidden);
        }
        const user = new User(req.body);
        const validationError = user.validate("mobile");
        if (validationError) {
            throw new ValidationError(validationError);
        }
        const result = await User.find<IUser>({ mobile: user.mobile });
        if (result.items.length !== 1) {
            throw new ValidationError({ mobile: "invalid" });
        }
        user.setValues(result.items[0]);
        // enumeration possibility
        // const randomNumber = Hashing.randomInt();
        // const sms = await TextMessage.getInstance()
        //     .sendMessage(`${this.tr("msg_reset_pass", randomNumber)}`, result.items[0].mobile);
        // if (sms.RetStatus === 1) {
        //     // updating user password
        //     user.password = Hashing.withSalt(`${randomNumber}`);
        //     await user.update();
        //     return res.json({});
        // }
        // todo: something goes wrong
        throw new Err(Err.Code.Server, "err_sms");
    }

    private async getMe(req: IExtRequest, res: Response, next: NextFunction) {
        const sourceApp = +req.get("From");

        if (this.isProduction) {
            if ([SourceApp.EndUser, SourceApp.Panel].indexOf(sourceApp) < 0) {
                throw new Err(Err.Code.Forbidden, null, "getMe", "AccountController");
            }
        }

        const user = this.getAuthUser(req);
        if (user.id) {
            const { items } = await User.find<IUser>(user.id, { relations: ["role"] });
            delete items[0].password;
            items[0].role = this.acl.updateRolePermissions(items[0].role as IRole);
            const token = JWT.sign({ user: this.getUserDataForSigning(items[0]) }, this.config.security.expireTime);
            return res.json({ items, token });
        }
        // guest user
        const { guestRoleName } = this.config.security;
        const guest = {
            role: this.acl.updateRolePermissions({ name: guestRoleName } as IRole),
            username: guestRoleName,
        };
        res.json({ items: [guest] });
    }

    private getUserDataForSigning(user: IUser) {
        return {
            id: user.id,
            role: user.role,
            type: user.type,
        }
    }
}
