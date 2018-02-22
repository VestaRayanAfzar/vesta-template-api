import { AclAction } from "../cmn/enum/Acl";
import { IPermission, Permission } from "../cmn/models/Permission";
import { IRole, Role } from "../cmn/models/Role";
import { User, UserType } from "../cmn/models/User";
import { Hashing } from "../helpers/Hashing";
import { IQueryResult } from "../medium";
import { config } from "./config";

export async function populate() {
    const { rootRoleName, guestRoleName, userRoleName } = config.security;
    // root Role & User
    const pResult = await Permission.find<IPermission>({ resource: "*", action: "*" });
    let role = new Role({ name: rootRoleName, desc: "Root role", permissions: [pResult.items[0].id] });
    let rInsert = await role.insert<IRole>();
    const root = new User({ type: [UserType.Admin], username: rootRoleName, password: Hashing.withSalt("to0r4L!fe"), role: rInsert.items[0].id });
    await root.insert();
    // guest Role
    const guestPermissions: Array<IQueryResult<IPermission>> = [
        // VIP: guest should be able to logout (* => login, register, forget, logout)
        await Permission.find({ resource: "account", action: "*" }),
        await Permission.find<IPermission>({ resource: "support", action: AclAction.Add }),
        await Permission.find<IPermission>({ resource: "context", action: AclAction.Read }),
    ];
    role = new Role({ name: guestRoleName, desc: "Guest role", permissions: guestPermissions.map((item) => item.items[0].id) });
    await role.insert();
    // user Role & test user
    const userPermissions: Array<IQueryResult<IPermission>> = [
        await Permission.find<IPermission>({ resource: "account", action: "logout" }),
        await Permission.find<IPermission>({ resource: "support", action: AclAction.Add }),
        await Permission.find<IPermission>({ resource: "context", action: AclAction.Read }),
        await Permission.find<IPermission>({ resource: "user", action: AclAction.Read }),
        await Permission.find<IPermission>({ resource: "user", action: AclAction.Edit }),
    ];
    role = new Role({ name: userRoleName, desc: "User role", permissions: userPermissions.map((item) => item.items[0].id) });
    rInsert = await role.insert<IRole>();
    const test = new User({ type: [UserType.User], username: "test", password: Hashing.withSalt("to0r4L!fe"), role: rInsert.items[0].id });
    await test.insert();
}
