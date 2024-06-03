import { Model, type Transformer } from './Model';

type DoneCallback = (model: Model) => any;

export interface ModelOptions {
    id_type: 'increment' | 'uuid' | 'noid';
    id_name: string;
    timestamp: {
        created: boolean;
        updated: boolean;
        deleted: boolean;
    };
}

interface ColumnOptions {
    default: any;
}
interface VarcharOptions extends ColumnOptions {
    size: number;
}
interface IntOptions extends ColumnOptions {
    unsigned: boolean;
}

export class ModelBuilder {
    static _defaultModelOption: ModelOptions = {
        id_type: 'increment',
        id_name: 'id',
        timestamp: {
            created: true,
            updated: true,
            deleted: false
        }
    };

    #model: Model;
    #columns: Map<string, Transformer> = new Map();
    #build: DoneCallback;

    constructor(_opts: Partial<ModelOptions>, build: DoneCallback) {
        this.#model = new Model();
        this.#build = build;
    }
    varchar(name: string, _opts?: Partial<VarcharOptions>) {
        this.#columns.set(name, (input: any) => String(input ?? ''));
        return this;
    }
    text(name: string, _opts?: Partial<ColumnOptions>) {
        this.#columns.set(name, (input: any) => String(input ?? ''));
        return this;
    }
    int(name: string, _opts?: Partial<IntOptions>) {
        this.#columns.set(name, (input: any) => parseInt(input) || 0);
        return this;
    }
    float(name: string, _opts?: Partial<ColumnOptions>) {
        this.#columns.set(name, (input: any) => parseFloat(input) || 0);
        return this;
    }
    bool(name: string, _opts?: Partial<ColumnOptions>) {
        this.#columns.set(name, (input: any) => Boolean(input));
        return this;
    }
    date(name: string, _opts?: Partial<ColumnOptions>) {
        this.#columns.set(name, (input: any) => new Date(input || 0));
        return this;
    }
    done(): Model {
        this.#model.defineColumns(this.#columns);
        this.#build(this.#model);
        return this.#model;
    }
}
