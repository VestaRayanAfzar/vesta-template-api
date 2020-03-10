import { AccountController } from "./controller/AccountController";
import { ContextController } from "./controller/ContextController";
import { IndexController } from "./controller/IndexController";
import { LogController } from "./controller/LogController";
import { PermissionController } from "./controller/PermissionController";
import { RoleController } from "./controller/RoleController";
import { SupportController } from "./controller/SupportController";
import { UserController } from "./controller/UserController";
// <vesta:import/>

export interface IExporter {
    controller: any;
}

export const exporter: IExporter = {
    controller: {
        account: AccountController,
        context: ContextController,
        index: IndexController,
        log: LogController,
        permission: PermissionController,
        role: RoleController,
        support: SupportController,
        user: UserController,
        // <vesta:expressController/>
    },
};
