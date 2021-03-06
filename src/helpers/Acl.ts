import { Hlc as C, Vql } from "@vesta/core";
import { AclAction, AclPolicy } from "@vesta/services";
import { IPermission, Permission } from "../cmn/models/Permission";
import { IRole, Role } from "../cmn/models/Role";
import { IAppConfig } from "../config";
import { populate } from "../config/db-population";

export interface IRolesList {
    [role: string]: IPermission[];
}

interface IResourceList {
    [name: string]: string[];
}

export class Acl {
    /** This is the universal collection of ll Permissions */
    private resourceList: IResourceList = {
        "*": [AclAction.All, AclAction.Read, AclAction.Add, AclAction.Edit, AclAction.Delete],
    };
    /** This is the {roleName: [IPermission]}, a collection of all roles */
    private roles: IRolesList = {};

    constructor(private config: IAppConfig, private defaultPolicy: AclPolicy) { }

    /**
     * Checks if a role has access to specific action on resource
     */
    public isAllowed(role: string, resource: string, action: string): boolean {
        if (!(role in this.roles)) {
            return this.defaultPolicy === AclPolicy.Allow;
        }
        for (let i = this.roles[role].length; i--;) {
            const permission = this.roles[role][i];
            if (permission.resource === "*" || permission.resource === resource) {
                if (permission.action === "*" || permission.action === action) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Adding new Permission to appPermissions (api-controllers -> checkAcl -> addResource)
     * @see this.initAcl comment for more information on appPermissions
     */
    public addResource(resource: string, action: string) {
        if (!this.resourceList[resource]) {
            this.resourceList[resource] = ["*"];
        }
        if (this.resourceList[resource].indexOf(action) < 0) {
            this.resourceList[resource].push(action);
        }
    }

    /**
     * appResource, appPermissions, appAction
     *      These are total resources that are generated by all controllers (New & Valid)
     *      Controllers calls the checkAcl(resource, action) on BaseController
     * dbResource, dbPermissions, dbAction
     *      These are resources that has been queried from database (Old & might be Invalid)
     */
    public async initAcl() {
        const pResult = await Permission.find<IPermission>(new Vql(Permission.schema.name));
        const dbPermissions: IPermission[] = pResult.items;
        const updateOperations = [];
        // Finding new permissions to be added to database
        const newPermissions: IPermission[] = [];
        for (let i = 0, appResources = Object.keys(this.resourceList), il = appResources.length; i < il; ++i) {
            const appResource = appResources[i];
            const appActions = this.resourceList[appResource];
            for (let j = appActions.length; j--;) {
                const appAction = appActions[j];
                let found = false;
                for (let k = dbPermissions.length; k--;) {
                    const dbResource = dbPermissions[k].resource;
                    const dbAction = dbPermissions[k].action;
                    if (appResource === dbResource && appAction === dbAction) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    newPermissions.push({ action: appAction, resource: appResource });
                }
            }
        }
        if (newPermissions.length) {
            updateOperations.push(Permission.insert(newPermissions));
        }
        // Finding deprecated permissions to be deleted from database
        const deprecatedPermissions = [];
        for (let i = dbPermissions.length; i--;) {
            const dbResource = dbPermissions[i].resource;
            const dbAction = dbPermissions[i].action;
            if (!this.resourceList[dbResource] || this.resourceList[dbResource].indexOf(dbAction) < 0) {
                deprecatedPermissions.push(dbPermissions[i].id);
            }
        }
        if (deprecatedPermissions.length) {
            const conditions = deprecatedPermissions.map(id => C.eq("id", id));
            updateOperations.push(Permission.remove(C.or(...conditions)));
        }
        // waiting for operations to finish
        if (updateOperations.length) {
            return Promise.all(updateOperations)
                .then(async () => (this.config.regenerateSchema ? await populate() : null))
                .then(() => this.loadRoles());
        }
        return this.loadRoles();
    }

    /**
     * Retrieve all permissions related to a role based on id or name of the role
     */
    public updateRolePermissions(role: IRole): IRole {
        if (!(role.name in this.roles)) {
            return role;
        }
        return { ...role, permissions: this.roles[role.name] };
    }

    /**
     * Enabling access of a role to a resource for a certain action - or all actions *
     * Populating the this.roles
     * This method will structure the records into IRolesList which will accelerate the ACL checking operations
     */
    private allow(role: string, resource: string, action: string) {
        if (!(role in this.roles)) {
            this.roles[role] = [];
        }
        this.roles[role].push({ resource, action });
    }

    /**
     * Enabling access of a role to a resource by calling `this.allow` -> this.roles
     */
    private update(roles: IRole[]) {
        if (!roles || !roles.length) {
            return;
        }
        for (let i = 0, il = roles.length; i < il; ++i) {
            const role = roles[i];
            if (!role.status) {
                continue;
            }
            for (let j = role.permissions.length; j--;) {
                const permission: IPermission = role.permissions[j] as IPermission;
                this.allow(role.name, permission.resource, permission.action);
            }
        }
    }

    /**
     * This method will query the database and loads all the roles to the memory in order to accelerate the ACL process
     */
    private loadRoles() {
        const roleQuery = new Vql(Role.schema.name);
        roleQuery.fetchRecordFor("permissions");
        return Role.find<IRole>(roleQuery).then(result => this.update(result.items));
    }
}
