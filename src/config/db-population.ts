import {User, UserType} from "../cmn/models/User";
import {IRole, Role} from "../cmn/models/Role";
import {IPermission, Permission} from "../cmn/models/Permission";
import {config} from "./config";
import {Hashing} from "../helpers/Hashing";
import {IQueryResult} from "../cmn/core/ICRUDResult";
import {AclAction} from "../cmn/enum/Acl";

export async function populate() {
    const {rootRoleName, guestRoleName, userRoleName} = config.security;
    // root Role & User
    let pResult = await Permission.find<IPermission>({resource: '*', action: '*'});
    let role = new Role({name: rootRoleName, desc: 'Root role', permissions: [pResult.items[0].id]});
    let rInsert = await role.insert<IRole>();
    let root = new User({
        type: [UserType.Admin],
        username: rootRoleName,
        password: Hashing.withSalt('to0r4L!fe'),
        role: rInsert.items[0].id
    });
    await root.insert();
    // guest Role
    let guest: Array<IQueryResult<IPermission>> = [
        await Permission.find<IPermission>({resource: 'account', action: 'login'}),
        await Permission.find<IPermission>({resource: 'account', action: 'forget'}),
        await Permission.find<IPermission>({resource: 'account', action: 'register'})
    ];
    role = new Role({name: guestRoleName, desc: 'Guest role', permissions: guest.map(item => item.items[0].id)});
    await role.insert();
    // user Role
    let user: Array<IQueryResult<IPermission>> = [
        await Permission.find<IPermission>({resource: 'account', action: 'logout'}),
        await Permission.find<IPermission>({resource: 'user', action: AclAction.Read}),
        await Permission.find<IPermission>({resource: 'user', action: AclAction.Edit}),
    ];
    role = new Role({name: userRoleName, desc: 'User role', permissions: user.map(item => item.items[0].id)});
    rInsert = await role.insert<IRole>();
    let test = new User({
        type: [UserType.User],
        username: 'test',
        password: Hashing.withSalt('to0r4L!fe'),
        role: rInsert.items[0].id
    });
    await test.insert();
}