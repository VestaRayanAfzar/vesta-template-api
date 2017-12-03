import {NextFunction, Response, Router} from "express";
import {BaseController, IExtRequest} from "../../BaseController";
import {DatabaseError} from "../../../cmn/core/error/DatabaseError";
import {Err} from "../../../cmn/core/Err";
import {ValidationError} from "../../../cmn/core/error/ValidationError";
import {Contact, IContact} from "../../../cmn/models/Contact";
import {AclAction} from "../../../cmn/enum/Acl";

export class ContactController extends BaseController {

    public route(router: Router) {
        router.get('/contact/count', this.checkAcl('contact', AclAction.Read), this.wrap(this.getContactCount));
        router.get('/contact/:id', this.checkAcl('contact', AclAction.Read), this.wrap(this.getContact));
        router.get('/contact', this.checkAcl('contact', AclAction.Read), this.wrap(this.getContacts));
        router.post('/contact', this.checkAcl('contact', AclAction.Add), this.wrap(this.addContact));
        router.put('/contact', this.checkAcl('contact', AclAction.Edit), this.wrap(this.updateContact));
        router.delete('/contact/:id', this.checkAcl('contact', AclAction.Delete), this.wrap(this.removeContact));
    }

    public async getContactCount(req: IExtRequest, res: Response, next: NextFunction) {
        let query = this.query2vql(Contact, req.query, true);
        let result = await Contact.count(query);
        res.json(result);
    }

    public async getContact(req: IExtRequest, res: Response, next: NextFunction) {
        let id = +req.params.id;
        if (isNaN(id)) {
            throw new ValidationError({id: 'number'});
        }
        let result = await Contact.find<IContact>(id);
        if (result.items.length != 1) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        res.json(result);
    }

    public async getContacts(req: IExtRequest, res: Response, next: NextFunction) {
        let query = this.query2vql(Contact, req.query);
        let result = await Contact.find(query);
        res.json(result);
    }

    public async addContact(req: IExtRequest, res: Response, next: NextFunction) {
        let contact = new Contact(req.body);
        contact.date = Date.now();

        let validationError = contact.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await contact.insert<IContact>();
        res.json(result);
    }

    public async updateContact(req: IExtRequest, res: Response, next: NextFunction) {
        let contact = new Contact(req.body);
        let validationError = contact.validate();
        if (validationError) {
            throw new ValidationError(validationError);
        }
        let result = await Contact.find<IContact>(contact.id);
        if (result.items.length != 1) {
            throw new DatabaseError(result.items.length ? Err.Code.DBRecordCount : Err.Code.DBNoRecord, null);
        }
        let uResult = await contact.update<IContact>();
        res.json(uResult);
    }

    public async removeContact(req: IExtRequest, res: Response, next: NextFunction) {
        let id = +req.params.id;
        if (isNaN(id)) {
            throw new ValidationError({id: 'number'});
        }
        let contact = new Contact({id});
        let result = await contact.remove();
        res.json(result);
    }
}
