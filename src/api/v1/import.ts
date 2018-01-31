import { AccountController } from "./controller/AccountController";
import { IndexController } from "./controller/IndexController";
import { PermissionController } from "./controller/PermissionController";
import { RoleController } from "./controller/RoleController";
import { UserController } from './controller/UserController';
import { SupportController } from './controller/SupportController';
import { ContextController } from './controller/ContextController';
import { LogController } from './controller/LogController';
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
        support: SupportController,
        context: ContextController,
        log: LogController,
        ///<vesta:expressController/>
    }
};