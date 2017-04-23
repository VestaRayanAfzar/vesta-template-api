import {AccountController} from "./controller/AccountController";
import {IndexController} from "./controller/IndexController";
import {PermissionController} from "./controller/PermissionController";
import {RoleController} from "./controller/RoleController";
import {RoleGroupController} from "./controller/RoleGroupController";
import {UserController} from './controller/UserController';
///<vesta:import/>

export interface IExporter {
    controller:any;
}

export const exporter:IExporter = {
    controller: {
        account: AccountController,
        index: IndexController,
        permission: PermissionController,
        role: RoleController,
        roleGroup: RoleGroupController,
        user: UserController,
		///<vesta:expressController/>
    }
};