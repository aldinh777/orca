import { State } from '@aldinh777/reactive/state/State';
import { StateCollection } from '@aldinh777/reactive/collection/StateCollection';
import { MutableStateList } from '@aldinh777/reactive/collection/MutableStateList';
import { AQUA_TAN_DIGIT_LIMIT, randomShit, removeInside } from '../help';
import RDBError from '../error/RDBError';
import RDBTable from './RDBTable';

export default class RDBRow extends StateCollection<string, any, void> {
    private _table: RDBTable;
    id: string;

    constructor(table: RDBTable, id: string = randomShit(AQUA_TAN_DIGIT_LIMIT)) {
        super();
        this._table = table;
        this.id = id;
    }

    get(colname: string): any {
        const { values } = this._table.getColumn(colname);
        return values.get(this);
    }
    set(colname: string, value: any): this {
        const { values, type, verify } = this._table.getColumn(colname);
        if (!verify(value)) {
            throw new RDBError('IMPOSSIBLE');
        }
        const oldvalue = values.get(this);
        if (type === 'ref') {
            if (oldvalue instanceof State) {
                oldvalue.setValue(value);
            } else {
                throw new RDBError('NOT_A_STATE');
            }
        } else {
            values.set(this, value);
            this.trigger('set', colname, value, oldvalue);
        }
        return this;
    }
    has(colname: string): boolean {
        const { values } = this._table.getColumn(colname);
        return values.has(this);
    }
    addRefs(colname: string, ...rows: RDBRow[]): void {
        const { type, ref, values } = this._table.getColumn(colname);
        if (type !== 'refs' || !ref) {
            throw new RDBError('REFS_ADD_FAILED', colname);
        }
        if (!(ref instanceof State)) {
            throw new RDBError('REFS_UNRESOLVED');
        }
        const table = ref.getValue();
        if (!(table instanceof RDBTable)) {
            throw new RDBError('HOW???');
        }
        const refs = values.get(this) as MutableStateList<RDBRow>;
        for (const row of rows) {
            if (!(row instanceof RDBRow)) {
                throw new RDBError('REFS_ADD_TYPE_MISMATCH', colname, row);
            }
            if (!table.hasRow(row)) {
                throw new RDBError('REFS_ADD_TABLE_MISMATCH', colname);
            }
            if (!refs.raw.includes(row)) {
                refs.push(row);
            }
        }
    }
    deleteRefs(colname: string, filter: (row: RDBRow) => boolean): void {
        const { type, values } = this._table.getColumn(colname);
        if (type !== 'refs') {
            throw new RDBError('REFS_DELETE_FAILED');
        }
        const refs = values.get(this) as MutableStateList<RDBRow>;
        for (const ref of refs.raw) {
            if (filter(ref)) {
                removeInside(refs, ref);
            }
        }
    }
    hasRef(colname: string, row: RDBRow): boolean {
        const { type, values } = this._table.getColumn(colname);
        if (type === 'ref') {
            const ref = values.get(this) as State<RDBRow | null>;
            const refrow = ref.getValue();
            return refrow === row;
        } else if (type === 'refs') {
            const refs = values.get(this) as MutableStateList<RDBRow>;
            return refs.raw.includes(row);
        } else {
            throw new RDBError('NOT_A_REFERENCE');
        }
    }
    getTable(): RDBTable {
        return this._table;
    }
    static destroy(row: RDBRow): void {
        row._upd.ins = [];
        row._upd.del = [];
        row._upd.set = [];
    }
}
