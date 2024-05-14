import { type State } from '@aldinh777/reactive';
import { type ReactiveList } from '@aldinh777/reactive/list';
import { AQUA_TAN_DIGIT_LIMIT, isRefference, randomShit, removeInside } from '../help';
import OrcaError from '../error/OrcaError';
import OrcaModel from './OrcaModel';

export default class OrcaRow {
    private _model: OrcaModel;
    id: string;

    constructor(model: OrcaModel, id: string = randomShit(AQUA_TAN_DIGIT_LIMIT)) {
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
    addRefs(columnName: string, ...rows: OrcaRow[]): void {
        const { type, ref, values } = this._model.getColumn(columnName);
        if (type !== 'refs' || !ref) {
            throw new OrcaError('REFS_ADD_FAILED', columnName);
        }
        if (!isRefference(ref)) {
            throw new OrcaError('REFS_UNRESOLVED');
        }
        const model = ref();
        if (!(model instanceof OrcaModel)) {
            throw new OrcaError('HOW???');
        }
        const refs = values.get(this) as ReactiveList<OrcaRow>;
        for (const row of rows) {
            if (!(row instanceof OrcaRow)) {
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
    deleteRefs(columnName: string, filter: (row: OrcaRow) => boolean): void {
        const { type, values } = this._model.getColumn(columnName);
        if (type !== 'refs') {
            throw new OrcaError('REFS_DELETE_FAILED');
        }
        const refs = values.get(this) as ReactiveList<OrcaRow>;
        for (const ref of refs()) {
            if (filter(ref)) {
                removeInside(refs, ref);
            }
        }
    }
    hasRef(columnName: string, row: OrcaRow): boolean {
        const { type, values } = this._model.getColumn(columnName);
        if (type === 'ref') {
            const ref = values.get(this) as State<OrcaRow | null>;
            const refrow = ref();
            return refrow === row;
        } else if (type === 'refs') {
            const refs = values.get(this) as ReactiveList<OrcaRow>;
            return refs().includes(row);
        } else {
            throw new OrcaError('NOT_A_REFERENCE');
        }
    }
    getModel(): OrcaModel {
        return this._model;
    }
}
