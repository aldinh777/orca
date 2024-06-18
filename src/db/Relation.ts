import type { Model } from './Model';

export class Relation<T extends {}, U extends {}> {
    from: Model<T>;
    to: Model<U>;

    constructor(from: Model<T>, to: Model<U>) {
        this.from = from;
        this.to = to;
    }

    through(relation: Relation<any, any>) {
        return relation;
    }
}
