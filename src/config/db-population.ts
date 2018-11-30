import { IResponse } from "@vesta/core";
import { AclAction } from "../cmn/enum/Acl";
import { IPermission, Permission } from "../cmn/models/Permission";
import { IRole, Role } from "../cmn/models/Role";
import { User, UserType } from "../cmn/models/User";
import { Hashing } from "../helpers/Hashing";
import { appConfig } from "./appConfig";

export async function populate() {
    const { rootRoleName, guestRoleName, userRoleName } = appConfig.security;
    // root Role & User
    const pResult = await Permission.find({ resource: "*", action: "*" });
    let role = new Role({ name: rootRoleName, desc: "Root role", permissions: [(pResult.items[0] as IPermission).id] });
    const rInsert = await role.insert<IRole>();
    const root = new User({
        firstName: rootRoleName,
        mobile: "09123456789",
        password: Hashing.withSalt("toor4L!fe"),
        role: rInsert.items[0].id,
        type: [UserType.Admin],
        username: rootRoleName,
    });
    await root.insert();
    // guest Role
    const guest: Array<IResponse<IPermission>> = [
        // VIP: guest should be able to logout (* => login, register, forget, logout)
        await Permission.find({ resource: "account", action: "*" }),
    ];
    role = new Role({ name: guestRoleName, desc: "Guest role", permissions: guest.map((item) => item.items[0].id) });
    await role.insert();
    // user Role
    const user: Array<IResponse<IPermission>> = [
        await Permission.find({ resource: "account", action: "logout" }),
        await Permission.find({ resource: "user", action: AclAction.Read }),
        await Permission.find({ resource: "user", action: AclAction.Edit }),
    ];
    role = new Role({ name: userRoleName, desc: "User role", permissions: user.map((item) => item.items[0].id) });
    await role.insert();
}
