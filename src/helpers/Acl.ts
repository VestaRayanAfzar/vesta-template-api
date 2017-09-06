import {IRole, Role} from "../cmn/models/Role";
import {IPermission, Permission} from "../cmn/models/Permission";
import {IRoleGroup, RoleGroup} from "../cmn/models/RoleGroup";
import {populate} from "../config/db-population";
import {IServerAppConfig} from "../config/config";
import {AclPolicy} from "../cmn/enum/Acl";
import {HLCondition, Vql} from "@vesta/core";

export interface IGroupsList {
    [group: string]: Array<IRole>
}

export interface IRolesList {
    [role: string]: Array<IPermission>
}

interface IResourceList {
    [name: string]: Array<string>;
}

export const enum AclScope {Model = 1, Entity, Field}

/**
 * Private (Read mine, Write mine)
 * Shared (Read all, Write mine)
 * ReadOnly (Read all, Write none)
 * Public (Read aa, Write all)
 */
export const enum AclAccessType {Private = 1, Shared, ReadOnly, Public}

export class Acl {
    /** This is the universal collection of ll Permissions */
    private resourceList: IResourceList = {
        '*': ['*', Permission.Action.Read, Permission.Action.Add, Permission.Action.Edit, Permission.Action.Delete]
    };
    /** This is the {roleName: [IPermission]}, a collection of all roles */
    private roles: IRolesList = {};
    /** This is the {groupName: [IRole]}, a collection of all groups with their roles */
    private groups: IGroupsList = {};

    constructor(private config: IServerAppConfig, private defaultPolicy: AclPolicy) {
    }

    /**
     * Enabling access of a role to a resource for a certain action - or all actions *
     * Populating the this.roles
     * This method will structure the records into IRolesList which will accelerate the ACL checking operations
     */
    private allow(roleName: string, resource: string, action?: string) {
        if (!(roleName in this.roles)) {
            this.roles[roleName] = [];
        }
        this.roles[roleName].push(<IPermission>{resource, action: action || '*'});
    }

    /**
     * Returns all roles for specific group
     * This will also populates the permissions on each role from this.roles list
     */
    public getGroupRoles(group: string): Array<IRole> {
        let roles: Array<IRole> = this.groups[group] ? JSON.parse(JSON.stringify(this.groups[group])) : [];
        for (let i = roles.length; i--;) {
            let roleName = roles[i].name;
            if (this.roles[roleName]) {
                roles[i].permissions = this.roles[roleName];
            }
        }
        return roles;
    }

    /**
     * Checks if a group has access to specific action on resource
     */
    public isAllowed(group: string, resource: string, action: string): boolean {
        if (!(group in this.groups)) return this.defaultPolicy == AclPolicy.Allow;
        for (let j = this.groups[group].length; j--;) {
            if (this.groups[group][j].status) {
                let roleName = this.groups[group][j].name;
                for (let i = this.roles[roleName].length; i--;) {
                    let permission = this.roles[roleName][i];
                    if (permission.resource == '*' || permission.resource == resource) {
                        if (permission.action == '*' || permission.action == action) return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Enabling access of a role to a resource by calling `this.allow` -> this.roles
     * Also caching the groups and their roles for future needs -> this.groups
     */
    private update(roles: Array<IRole>, groups: Array<IRoleGroup>) {
        if (!roles || !roles.length) return;
        for (let i = roles.length; i--;) {
            let role = roles[i];
            if (role.status) {
                for (let j = role.permissions.length; j--;) {
                    let permission: IPermission = <IPermission>role.permissions[j];
                    if (permission.status) this.allow(role.name, permission.resource, permission.action);
                }
            }
        }
        for (let i = groups.length; i--;) {
            let group = groups[i];
            if (group.status && group.roles) {
                this.groups[group['name']] = <Array<IRole>>group.roles;
            }
        }
    }

    /**
     * Adding new Permission to appPermissions (api-controllers -> checkAcl -> addResource)
     * @see this.initAcl comment for more information on appPermissions
     */
    public addResource(resource: string, action: string) {
        if (!this.resourceList[resource]) {
            this.resourceList[resource] = ['*'];
        }
        if (this.resourceList[resource].indexOf(action) < 0) {
            this.resourceList[resource].push(action);
        }
    }

    /**
     * appResource, appPermissions, appAction   These are total resources that are generated by all controllers (New & Valid)
     *                                              Controllers calls the checkAcl(resource, action) on BaseController
     * dbResource, dbPermissions, dbAction      These are resources that has been queried from database (Old & might be Invalid)
     */
    public initAcl() {
        return Permission.find<Permission>(new Vql(Permission.schema.name))
            .then(result => {
                let updateOperations = [];
                // Finding new permissions to be added to database
                let newPermissions: Array<IPermission> = [];
                for (let k = 0, appResources = Object.keys(this.resourceList), kl = appResources.length; k < kl; ++k) {
                    let appResource = appResources[k];
                    let appPermissions = this.resourceList[appResource];
                    for (let i = 0; i < appPermissions.length; i++) {
                        let found = false;
                        let appAction = appPermissions[i];
                        // Searching the database records for specific (resource, action) and if notFound -> insert it
                        for (let j = result.items.length; j--;) {
                            let dbPermission = result.items[j];
                            if (dbPermission.resource == appResource && dbPermission.action == appAction) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            newPermissions.push({resource: appResource, action: appAction, status: true});
                        }
                    }
                }
                if (newPermissions.length) {
                    updateOperations.push(Permission.insert(newPermissions));
                }
                // Finding deprecated permissions to be deleted from database
                let deprecatedPermissions = [];
                for (let i = result.items.length; i--;) {
                    let dbResource: string = result.items[i].resource;
                    let dbAction: string = result.items[i].action;
                    if (!this.resourceList[dbResource] || this.resourceList[dbResource].indexOf(dbAction) < 0) {
                        deprecatedPermissions.push(result.items[i].id);
                    }
                }
                if (deprecatedPermissions.length) {
                    let conditions = [];
                    for (let i = deprecatedPermissions.length; i--;) {
                        conditions.push(HLCondition.eq('id', deprecatedPermissions[i]));
                    }
                    updateOperations.push(Permission.remove(HLCondition.or(...conditions)));
                }
                // todo is there a case in which no update occurred but populate function needs to be called ???
                if (updateOperations.length) {
                    return Promise.all(updateOperations)
                        .then(() => this.config.regenerateSchema ? populate() : null);
                }
            })
            .then(() => this.loadRoleGroups())
    }

    /**
     * This method will query the database and loads all the roles and groups to the memory in order to accelerate the ACL process
     */
    private loadRoleGroups() {
        let roleQuery = new Vql(Role.schema.name);
        roleQuery.fetchRecordFor('permissions');
        let rolePromise = Role.find<IRole>(roleQuery).then(result => result.items);
        let groupQuery = new Vql(RoleGroup.schema.name);
        groupQuery.fetchRecordFor('roles');
        let groupPromise = RoleGroup.find<IRoleGroup>(groupQuery).then(result => result.items);
        return Promise.all([rolePromise, groupPromise]).then(data => {
            this.update(<Array<IRole>>data[0], <Array<IRoleGroup>>data[1]);
        })
    }
}