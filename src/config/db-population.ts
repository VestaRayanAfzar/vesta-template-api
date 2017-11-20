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
    let pResult = await Permission.find({resource: '*', action: '*'});
    let role = new Role({name: rootRoleName, desc: 'Root role', permissions: [pResult.items[0]['id']]});
    let rInsert = await role.insert<IRole>();
    let root = new User({
        mobile: '09123456789',
        type: [UserType.Admin],
        name: rootRoleName,
        username: rootRoleName,
        password: Hashing.withSalt('toor4L!fe'),
        role: rInsert.items[0].id
    });
    await root.insert();
    // guest Role
    let guest: Array<IQueryResult<IPermission>> = [
        await Permission.find({resource: 'account', action: 'login'}),
        await Permission.find({resource: 'account', action: 'forget'}),
        await Permission.find({resource: 'account', action: 'register'})
    ];
    role = new Role({name: guestRoleName, desc: 'Guest role', permissions: guest.map(item => item.items[0].id)});
    await role.insert();
    // guest Role
    let user: Array<IQueryResult<IPermission>> = [
        await Permission.find({resource: 'account', action: 'logout'}),
        await Permission.find({resource: 'user', action: AclAction.Read}),
        await Permission.find({resource: 'user', action: AclAction.Edit}),
    ];
    role = new Role({name: userRoleName, desc: 'User role', permissions: user.map(item => item.items[0].id)});
    await role.insert();
}