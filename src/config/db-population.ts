import {User} from "../cmn/models/User";
import {IRole, Role} from "../cmn/models/Role";
import {Permission} from "../cmn/models/Permission";
import {IRoleGroup, RoleGroup} from "../cmn/models/RoleGroup";
import {config} from "./config";
import {Hashing} from "../helpers/Hashing";

export function populate() {
    let rootPromise = Permission.find({resource: '*', action: '*'})
        .then(result => {
            return (new Role({
                name: config.security.rootRoleName,
                desc: 'Root role',
                permissions: [result.items[0]['id']]
            })).insert<IRole>()
        })
        .then(result => {
            return (new RoleGroup({
                name: config.security.rootRoleName,
                desc: 'Root Role Group',
                roles: [result.items[0].id]
            })).insert<IRoleGroup>()
        })
        .then(result => {
            return (new User({
                username: 'root',
                password: Hashing.withSalt('toor4L!fe'),
                roleGroups: [result.items[0]['id']]
            })).insert();
        });

    let guest = [];
    guest.push(Permission.find({resource: 'account', action: 'login'}));
    guest.push(Permission.find({resource: 'account', action: 'register'}));
    let guestPromise = Promise.all(guest)
        .then(data => {
            return (new Role({
                name: config.security.guestRoleName,
                desc: 'Guest role',
                permissions: [data[0].items[0].id, data[1].items[0].id]
            })).insert<IRole>()
        })
        .then(result => {
            return (new RoleGroup({
                name: config.security.guestRoleName,
                desc: 'Guest Role Group',
                roles: [result.items[0].id]
            })).insert<IRoleGroup>();
        });

    return Promise.all([rootPromise, guestPromise]);
}