import { type State } from '@aldinh777/reactive';
import { type ReactiveList } from '@aldinh777/reactive/list';
import { AQUA_TAN_DIGIT_LIMIT, isRefference, randomShit, removeInside } from '../help';
import OrcaError from '../error/OrcaError';
import Model from './Model';

export default class Row {
    private _model: Model;
    id: string;

    constructor(model: Model, id: string = randomShit(AQUA_TAN_DIGIT_LIMIT)) {
        this._model = model;
        this.id = id;
    }

    get(columnName: string): any {
        const { values } = this._model.getColumn(columnName);
        return values.get(this);
    }
    set(columnName: string, value: any): this {
        const { values, type, verify } = this._model.getColumn(columnName);
        if (!verify(value)) {
            throw new OrcaError('IMPOSSIBLE');
        }
        const oldValue = values.get(this);
        if (type === 'ref') {
            if (isRefference(oldValue)) {
                oldValue(value);
            } else {
                throw new OrcaError('NOT_A_STATE');
            }
        } else {
            values.set(this, value);
        }
        return this;
    }
    has(columnName: string): boolean {
        const { values } = this._model.getColumn(columnName);
        return values.has(this);
    }
    addRefs(columnName: string, ...rows: Row[]): void {
        const { type, ref, values } = this._model.getColumn(columnName);
        if (type !== 'refs' || !ref) {
            throw new OrcaError('REFS_ADD_FAILED', columnName);
        }
        if (!isRefference(ref)) {
            throw new OrcaError('REFS_UNRESOLVED');
        }
        const model = ref();
        if (!(model instanceof Model)) {
            throw new OrcaError('HOW???');
        }
        const refs = values.get(this) as ReactiveList<Row>;
        for (const row of rows) {
            if (!(row instanceof Row)) {
                throw new OrcaError('REFS_ADD_TYPE_MISMATCH', columnName, row);
            }
            if (!model.hasRow(row)) {
                throw new OrcaError('REFS_ADD_MODEL_MISMATCH', columnName);
            }
            if (!refs().includes(row)) {
                refs.push(row);
            }
        }
    }
    deleteRefs(columnName: string, filter: (row: Row) => boolean): void {
        const { type, values } = this._model.getColumn(columnName);
        if (type !== 'refs') {
            throw new OrcaError('REFS_DELETE_FAILED');
        }
        const refs = values.get(this) as ReactiveList<Row>;
        for (const ref of refs()) {
            if (filter(ref)) {
                removeInside(refs, ref);
            }
        }
    }
    hasRef(columnName: string, row: Row): boolean {
        const { type, values } = this._model.getColumn(columnName);
        if (type === 'ref') {
            const ref = values.get(this) as State<Row | null>;
            const refrow = ref();
            return refrow === row;
        } else if (type === 'refs') {
            const refs = values.get(this) as ReactiveList<Row>;
            return refs().includes(row);
        } else {
            throw new OrcaError('NOT_A_REFERENCE');
        }
    }
}
