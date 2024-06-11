import { Relation } from './Relation';

export type Transformer = (input: any) => any;

export class Model<T extends {}> {
    #rows: T[] = [];
    #columns!: Map<keyof T, Transformer>;

    // Column Definition
    defineColumns(columns: Map<keyof T, Transformer>) {
        this.#columns = columns;
    }

    // Crud Operations
    insert(item: Partial<T>) {
        const raw = {} as T;
        const row: T = new Proxy(raw, {
            set: (target, p, newValue) => {
                const tranform = this.#columns.get(p as keyof T);
                return tranform === undefined || Reflect.set(target, p, tranform(newValue));
            }
        });
        for (const column of this.#columns.keys()) {
            row[column] = item[column]!;
        }
        this.#rows.push(row);
        return row;
    }
    insertAll(items: Partial<T>[]) {
        return items.map((row) => this.insert(row));
    }
    where(filter: (row: T) => boolean, handler?: (row: T) => any) {
        const result = this.#rows.filter(filter);
        if (handler) {
            result.forEach(handler);
        }
        return result;
    }
    find(filter: (row: T) => boolean) {
        return this.#rows.find(filter);
    }
    delete(row: T) {
        this.#rows.splice(this.#rows.indexOf(row), 1);
    }

    // Create Relations
    hasOne<U extends {}>(name: keyof T, target: Model<U>, _relation?: Relation<U, T>) {
        this.#columns.set(name, (input) =>
            typeof input === 'object'
                ? input === null || target.#rows.includes(input)
                    ? input
                    : target.insert(input)
                : null
        );
        return new Relation(this, target);
    }
    hasMany<U extends {}>(_name: string, target: Model<U>, _relation?: Relation<U, T>) {
        return new Relation(this, target);
    }
}
