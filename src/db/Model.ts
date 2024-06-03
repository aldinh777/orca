import { ManyToManyRelation, OneToManyRelation, OneToOneRelation } from './Relation';

type Row = Record<string, any>;
export type Transformer = (input: any) => any;

export class Model {
    #rows: Row[] = [];
    #columns!: Map<string, Transformer>;

    // Column Definition
    defineColumns(columns: Map<string, Transformer>) {
        this.#columns = columns;
    }

    // Crud Operations
    insert(item: Row) {
        const raw = {};
        const row: Row = new Proxy(raw, {
            set: (target, p, newValue) => {
                const tranform = this.#columns.get(p as string);
                return tranform === undefined || Reflect.set(target, p, tranform(newValue));
            },
            deleteProperty: (_, p) => {
                if (p === 'this') {
                    this.#rows.splice(this.#rows.indexOf(row), 1);
                    Object.freeze(raw);
                }
                return true;
            }
        });
        for (const column of this.#columns.keys()) {
            row[column] = item[column];
        }
        this.#rows.push(row);
        return row;
    }
    insertAll(items: Row[]) {
        return items.map((row) => this.insert(row));
    }
    where(filter: (row: Row) => boolean, handler?: (row: Row) => any) {
        const result = this.#rows.filter(filter);
        if (handler) {
            result.forEach(handler);
        }
        return result;
    }

    // Create Relations
    hasOneToOne(_name: string, target: Model) {
        return new OneToOneRelation(this as Model, target);
    }
    hasOneToMany(_name: string, target: Model, _relation: OneToOneRelation) {
        return new OneToManyRelation(this, target);
    }
    hasManyToMany(_name: string, target: Model, _relation?: ManyToManyRelation) {
        return new ManyToManyRelation(this, target);
    }
}
