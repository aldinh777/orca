import type { Model } from './Model';

export class Relation {
    #from: Model;
    #to: Model;

    constructor(from: Model, to: Model) {
        this.#from = from;
        this.#to = to;
    }
}

export class OneToManyRelation extends Relation {}

export class OneToOneRelation extends Relation {}

export class ManyToManyRelation extends Relation {}
