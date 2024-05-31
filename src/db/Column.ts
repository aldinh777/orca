import OrcaError from '../error/OrcaError';
import type Model from './Model';
import type Row from './Row';

export default class Column<T = any, U = T> {
    private values: WeakMap<Row, U> = new WeakMap();
    private transform: (value: T) => U;
    private refModel?: Model | string;

    constructor(transform: (value: T) => U, ref?: string | Model) {
        this.transform = transform;
        this.refModel = ref;
    }
    getValue(row: Row) {
        return this.values.get(row);
    }
    setValue(row: Row, value: T) {
        this.values.set(row, this.transform(value));
    }

    getRefModel(source: string): Model {
        if (!this.refModel) {
            throw new OrcaError('MODEL_REF_INVALIDATED', source);
        }
        if (typeof this.refModel === 'string') {
            throw new OrcaError('MODEL_REF_UNRESOLVED', source, this.refModel);
        }
        return this.refModel;
    }
}
