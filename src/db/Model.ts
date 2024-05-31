import { ManyToManyRelation, OneToManyRelation, OneToOneRelation } from './Relation';

export class Model {
    // Crud Operations
    insert(_item: Record<string, any>) {
        return _item;
    }
    insertAll(_items: Record<string, any>[]) {
        return _items;
    }

    // Create Relations
    hasOne(_name: string, _target: Model) {
        return new OneToOneRelation();
    }
    hasMany(_name: string, _target: Model, _relation: OneToOneRelation) {
        return new OneToManyRelation();
    }
    hasRelation(_name: string, _target: Model, _relation?: ManyToManyRelation) {
        return new ManyToManyRelation();
    }
}
