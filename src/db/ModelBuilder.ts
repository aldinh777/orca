import { Model } from './Model';

type DoneCallback = (model: Model) => any;

export interface ModelOptions {
    id_type: 'increment' | 'uuid';
    id_name: string;
}
interface ColumnOptions {
    required: boolean; // not null
}
interface VarcharOptions extends ColumnOptions {
    size: number;
}
interface IntOptions extends ColumnOptions {
    unsigned: boolean;
}

export class ModelBuilder {
    #model: Model;
    #build: DoneCallback;

    constructor(_opts: Partial<ModelOptions>, build: DoneCallback) {
        this.#model = new Model();
        this.#build = build;
    }
    varchar(_name: string, _opts?: Partial<VarcharOptions>) {
        return this;
    }
    text(_name: string, _opts?: Partial<ColumnOptions>) {
        return this;
    }
    int(_name: string, _opts?: Partial<IntOptions>) {
        return this;
    }
    float(_name: string, _opts?: Partial<ColumnOptions>) {
        return this;
    }
    bool(_name: string, _opts?: Partial<ColumnOptions>) {
        return this;
    }
    date(_name: string, _opts?: Partial<ColumnOptions>) {
        return this;
    }
    done(): Model {
        this.#build(this.#model);
        return this.#model;
    }
}
