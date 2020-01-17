import { IResponse } from "@vesta/core";
import { AclAction } from "@vesta/services";
import config from ".";
import { IPermission, Permission } from "../cmn/models/Permission";
import { IRole, Role } from "../cmn/models/Role";
import { IUser, User, UserType } from "../cmn/models/User";
import { Hashing } from "../helpers/Hashing";

export async function populate() {
    const { rootRoleName, guestRoleName, userRoleName } = config.security;
    // root Role & User
    const pResult = await Permission.find({ resource: "*", action: "*" });
    let role = new Role({
        desc: "Root role", name: rootRoleName, permissions: [(pResult.items[0] as IPermission).id],
    } as IRole);
    const rInsert = await role.insert<IRole>();
    const root = new User({
        firstName: rootRoleName,
        mobile: "09123456789",
        password: Hashing.withSalt("toor4L!fe"),
        role: rInsert.items[0].id,
        type: [UserType.Admin],
        username: rootRoleName,
    } as IUser);
    await root.insert();
    // guest Role
    const guest: Array<IResponse<IPermission>> = [
        // VIP: guest should be able to logout (* => login, register, forget, logout)
        await Permission.find({ resource: "account", action: "*" } as IPermission),
    ];
    role = new Role({
        desc: "Guest role", name: guestRoleName, permissions: guest.map((item) => item.items[0].id),
    } as IRole);
    await role.insert();
    // user Role
    const user: Array<IResponse<IPermission>> = [
        await Permission.find({ resource: "account", action: "logout" } as IPermission),
        await Permission.find({ resource: "user", action: AclAction.Read } as IPermission),
        await Permission.find({ resource: "user", action: AclAction.Edit } as IPermission),
    ];
    role = new Role({
        desc: "User role", name: userRoleName, permissions: user.map((item) => item.items[0].id),
    } as IRole);
    await role.insert();
}
