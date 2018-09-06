import { NextFunction, Response, Router } from "express";
import { LogLevel } from "../../../cmn/models/Log";
import { IRole, Role } from "../../../cmn/models/Role";
import { IUser, SourceApp, User, UserType } from "../../../cmn/models/User";
import { Hashing } from "../../../helpers/Hashing";
import { TextMessage } from "../../../helpers/TextMessage";
import { DatabaseError, Err, IQueryResult, ValidationError } from "../../../medium";
import { Session } from "../../../session/Session";
import { BaseController, IExtRequest } from "../../BaseController";

export class AccountController extends BaseController {
    private message = {
        password: "کلمه ورود شما: ",
    };

    public route(router: Router) {
        router.get("/me", this.wrap(this.getMe));
        router.post("/account", this.checkAcl("account", "register"), this.wrap(this.register));
        router.post("/account/login", this.checkAcl("account", "login"), this.wrap(this.login));
        router.post("/account/forget", this.checkAcl("account", "forget"), this.wrap(this.forget));
        router.get("/account/logout", this.checkAcl("account", "logout"), this.wrap(this.logout));
    }

    private async register(req: IExtRequest, res: Response, next: NextFunction) {
        let userExists = false;
        const sourceApp = req.body.s;
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
        const role = await Role.find<IRole>({ name: userRoleName });
        if (!role.items.length) {
            throw new Err(Err.Code.OperationFailed, "err_no_role");
        }
        user.role = role.items[0].id;
        const result = userExists ? await user.update<IUser>() : await user.insert<IUser>();
        return res.json({});
    }

    private async login(req: IExtRequest, res: Response, next: NextFunction) {
        const sourceApp = req.body.s;
        if ([SourceApp.EndUser, SourceApp.Panel].indexOf(sourceApp) < 0) {
            throw new Err(Err.Code.WrongInput);
        }
        const user = new User(req.body);
        const validationError = user.validate("username", "password");
        if (validationError) {
            throw new ValidationError(validationError);
        }
        user.password = Hashing.withSalt(user.password);
        const result = await User.find<IUser>({ username: user.username, password: user.password },
            { relations: ["role"] });
        if (result.items.length !== 1) {
            throw new Err(Err.Code.DBNoRecord);
        }
        result.items[0].role = this.acl.updateRolePermissions(result.items[0].role as IRole);
        user.setValues(result.items[0]);
        user.sourceApp = sourceApp;
        delete user.password;
        // prevent admin from logging into application
        if (this.isAdmin(user) && user.sourceApp !== SourceApp.Panel) {
            throw new Err(Err.Code.Forbidden, "err_admin_login");
        }
        // prevent other users from logging into panel
        if (user.sourceApp === SourceApp.Panel && !user.isOfType(UserType.Admin)) {
            throw new Err(Err.Code.Forbidden, "err_user_admin_login");
        }
        // prevent none user from logging into user app
        if (user.sourceApp === SourceApp.EndUser && !user.isOfType(UserType.User)) {
            throw new Err(Err.Code.Forbidden, "err_none_user_login");
        }
        req.session.destroy();
        const session = await Session.create(req.body.rememberMe);
        Session.setAuthToken(res, session.sessionId);
        req.session = session;
        req.session.set("user", user.getValues());
        res.json({ items: [user] });
    }

    private async logout(req: IExtRequest, res: Response, next: NextFunction) {
        const result = await User.find<IUser>(this.getUserFromSession(req).id);
        if (result.items.length !== 1) {
            throw new DatabaseError(Err.Code.DBNoRecord, null);
        }
        req.session.destroy();
        const session = await Session.create();
        Session.setAuthToken(res, session.sessionId);
        await this.getMe(req, res, next);
    }

    private async forget(req: IExtRequest, res: Response, next: NextFunction) {
        const sourceApp = req.body.s;
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
        const randomNumber = Hashing.randomInt();
        const sms = await TextMessage.getInstance()
            .sendMessage(`${this.message.password}${randomNumber}`, result.items[0].mobile);
        if (sms.RetStatus === 1) {
            // updating user password
            user.password = Hashing.withSalt(`${randomNumber}`);
            await user.update();
            return res.json({});
        }
        // todo: something goes wrong
        throw new Err(Err.Code.OperationFailed, "err_sms");
    }

    private async getMe(req: IExtRequest, res: Response, next: NextFunction) {
        // <production>
        const sourceApp = +req.query.s;
        if ([SourceApp.EndUser, SourceApp.Panel].indexOf(sourceApp) < 0) {
            throw new Err(Err.Code.Forbidden, null, "getMe", "AccountController");
        }
        // </production>
        const user = this.getUserFromSession(req);
        if (user.id) {
            const result = await User.find<IUser>(user.id, { relations: ["role"] });
            result.items[0].role = this.acl.updateRolePermissions(result.items[0].role as IRole);
            delete result.items[0].password;
            res.json(result);
        } else {
            const { guestRoleName } = this.config.security;
            const guest = {
                role: this.acl.updateRolePermissions({ name: guestRoleName }),
                username: guestRoleName,
            } as IUser;
            res.json({ items: [guest] } as IQueryResult<IUser>);
        }
    }
}
