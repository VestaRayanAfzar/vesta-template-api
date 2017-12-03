import {AccountController} from "./controller/AccountController";
import {IndexController} from "./controller/IndexController";
import {PermissionController} from "./controller/PermissionController";
import {RoleController} from "./controller/RoleController";
import {UserController} from './controller/UserController';
import {ContactController} from './controller/ContactController';
import {ContextController} from './controller/ContextController';
///<vesta:import/>

export interface IExporter {
    controller: any;
}

export const exporter: IExporter = {
    controller: {
        account: AccountController,
        index: IndexController,
        permission: PermissionController,
        role: RoleController,
        user: UserController,
        contact: ContactController,
        context: ContextController,
        ///<vesta:expressController/>
    }
};