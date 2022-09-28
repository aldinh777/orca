import { StateCollection, StateList } from '@aldinh777/reactive/collection';
import RDBTable, { ColumnStructure } from './RDBTable';
import { AQUA_TAN_DIGIT_LIMIT, randomShit, removeInside } from './help';
import { State } from '@aldinh777/reactive';
import RDBError from '../error/RDBError';

export default class RDBRow extends StateCollection<string, any, void> {
    private _columns: Map<string, ColumnStructure>;
    id: string;

    constructor(columns: Map<string, ColumnStructure>) {
        super();
        this._columns = columns;
        this.id = randomShit(AQUA_TAN_DIGIT_LIMIT);
    }

    get(colname: string): any {
        const { values } = this.getColumn(colname);
        return values.get(this);
    }
    set(colname: string, value: any): this {
        const { values, type, verify } = this.getColumn(colname);
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
        const { values } = this.getColumn(colname);
        return values.has(this);
    }
    addRefs(colname: string, ...rows: RDBRow[]): void {
        const { type, ref, values } = this.getColumn(colname);
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
        const refs = values.get(this) as StateList<RDBRow>;
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
        const { type, values } = this.getColumn(colname);
        if (type !== 'refs') {
            throw new RDBError('REFS_DELETE_FAILED');
        }
        const refs = values.get(this) as StateList<RDBRow>;
        for (const ref of refs.raw) {
            if (filter(ref)) {
                removeInside(refs, ref);
            }
        }
    }
    hasRef(colname: string, row: RDBRow): boolean {
        const { type, values } = this.getColumn(colname);
        if (type === 'ref') {
            const ref = values.get(this) as State<RDBRow | null>;
            const refrow = ref.getValue();
            return refrow === row;
        } else if (type === 'refs') {
            const refs = values.get(this) as StateList<RDBRow>;
            return refs.raw.includes(row);
        } else {
            throw new RDBError('NOT_A_REFERENCE');
        }
    }
    eachColumn(callback: (name: string, column: ColumnStructure) => void): void {
        this._columns.forEach((column, name) => {
            callback(name, column);
        });
    }
    getColumn(colname: string): ColumnStructure {
        const column = this._columns.get(colname);
        if (!column) {
            throw new RDBError('INVALID_COLUMN', colname);
        }
        return column;
    }
}
