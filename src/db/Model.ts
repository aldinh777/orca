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
    hasOne(_name: string, target: Model) {
        return new OneToOneRelation(this, target);
    }
    hasMany(_name: string, target: Model, _relation: OneToOneRelation) {
        return new OneToManyRelation(this, target);
    }
    hasManyToMany(_name: string, target: Model, _relation?: ManyToManyRelation) {
        return new ManyToManyRelation(this, target);
    }
}
