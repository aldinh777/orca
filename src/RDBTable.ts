import { State } from '@aldinh777/reactive';
import { StateCollection, StateList } from '@aldinh777/reactive/collection';
import { removeInside } from './help';
import RDB from './RDB';
import RDBRow from './RDBRow';
import RDBError from '../error/RDBError';

export type columnType = 'string' | 'number' | 'boolean' | 'ref' | 'refs';

export interface ColumnStructure {
    type: columnType;
    verify: (value: any) => boolean;
    ref?: State<RDBTable | string>;
    values: WeakMap<RDBRow, any>;
}

export default class RDBTable extends StateCollection<string, RDBRow, RDBRow[]> {
    private _db: RDB;
    private _columns: Map<string, ColumnStructure> = new Map();

    constructor(db: RDB, columns: object) {
        super();
        this._db = db;
        this.raw = [];
        for (const column in columns) {
            const type: string = (columns as any)[column];
            this.addColumn(column, type);
        }
    }
    getName(): string | undefined {
        return this._db.getTableName(this);
    }

    get(id: string): RDBRow | undefined {
        return this.selectRow((row) => row.get('id') === id);
    }
    set(_id: string, _value: RDBRow): this {
        throw new Error('Method not implemented, on purpose!');
    }
    hasRow(row: RDBRow): boolean {
        return this.raw.includes(row);
    }

    addColumn(name: string, type: string): void {
        this._columns.set(name, this.createColumnStructure(type));
    }
    dropColumn(name: string): void {
        if (!this._columns.has(name)) {
            throw new RDBError('COLUMN_DROP_NOT_EXISTS', name, this.getName());
        }
        this._columns.delete(name);
    }
    modifyColumn(name: string, type: string): void {
        if (!this._columns.has(name)) {
            throw new RDBError('COLUMN_NOT_EXISTS', name);
        }
        if (this.raw.length > 0) {
            throw new RDBError('COLUMN_IN_DANGER');
        }
        this._columns.set(name, this.createColumnStructure(type));
    }
    renameColumn(oldname: string, newname: string): void {
        if (!this._columns.has(oldname)) {
            throw new RDBError('COLUMN_RENAME_NOT_EXISTS', oldname, this.getName());
        }
        if (this._columns.has(newname)) {
            throw new RDBError('COLUMN_RENAME_TARGET_EXISTS', oldname, newname, this.getName());
        }
        const column = this._columns.get(oldname) as ColumnStructure;
        this._columns.delete(oldname);
        this._columns.set(newname, column);
    }

    insert(o: object): RDBRow {
        const row = new RDBRow(this._columns);
        // Iterate to be insert object and verify item
        for (const colname in o) {
            const value = (o as any)[colname];
            const column = this._columns.get(colname);
            if (!column) {
                throw new RDBError('INSERT_INVALID_COLUMN', colname, this.getName(), o);
            }
            const { type, verify, values, ref } = column;
            if (type === 'ref' || type === 'refs') {
                const table = this.validateRefTable(ref);
                if (type === 'ref') {
                    if (typeof value !== 'object') {
                        throw new RDBError('INSERT_INVALID_REF', colname);
                    }
                    const ref = table.insert(value);
                    const refState = this.createRef(table, ref);
                    values.set(row, refState);
                } else if (type === 'refs') {
                    if (!(value instanceof Array)) {
                        throw new RDBError('INSERT_INVALID_REFS', colname);
                    }
                    const refs = table.insertAll(value);
                    const refferences = this.createRefs(table, refs);
                    values.set(row, refferences);
                }
            } else {
                verify(value);
                values.set(row, value);
            }
        }
        // Iterate structure ensure everything mandatory is filled
        this._columns.forEach((column) => {
            const { type, values, ref } = column;
            if (!values.has(row)) {
                switch (type) {
                    case 'ref':
                        values.set(row, this.createRef(this.validateRefTable(ref)));
                        break;
                    case 'refs':
                        values.set(row, this.createRefs(this.validateRefTable(ref), []));
                        break;
                    case 'string':
                        values.set(row, '');
                        break;
                    case 'number':
                        values.set(row, 0);
                        break;
                    case 'boolean':
                        values.set(row, false);
                        break;
                    default:
                        throw new RDBError('WHAT_IS_HAPPENING', type);
                }
            }
        });
        this.raw.push(row);
        this.trigger('ins', row.id, row);
        return row;
    }
    insertAll(obs: object[]): RDBRow[] {
        const inserteds: RDBRow[] = [];
        for (const o of obs) {
            inserteds.push(this.insert(o));
        }
        return inserteds;
    }
    delete(filter: '*' | ((row: RDBRow) => boolean)): void {
        const rawlist = this.raw;
        const dellist = rawlist.filter(filter === '*' ? () => true : filter);
        for (const delrow of dellist) {
            const index = rawlist.indexOf(delrow);
            this.raw.splice(index, 1);
            this.trigger('del', delrow.id, delrow);
        }
    }
    selectRow(
        filter: (row: RDBRow) => boolean,
        callback?: (row: RDBRow) => void
    ): RDBRow | undefined {
        for (const row of this.raw) {
            if (filter(row)) {
                if (callback) {
                    callback(row);
                }
                return row;
            }
        }
    }
    selectRows(
        filter: '*' | ((row: RDBRow) => boolean),
        callback?: (row: RDBRow) => void
    ): RDBRow[] {
        const rawlist = this.raw;
        const rows = filter === '*' ? [...rawlist] : rawlist.filter(filter);
        if (callback) {
            for (const row of rows) {
                callback(row);
            }
        }
        return rows;
    }

    private validateRefTable(ref: State<string | RDBTable> | undefined): RDBTable {
        if (!ref) {
            throw new RDBError('TABLE_REF_INVALIDATED', this.getName());
        }
        const table = ref.getValue();
        if (typeof table === 'string') {
            throw new RDBError('TABLE_REF_UNRESOLVED', this.getName(), table);
        }
        return table;
    }

    private createRef(table: RDBTable, ref?: RDBRow): State<RDBRow | null> {
        const refState = new State(ref || null);
        table.onDelete((_, deleted) => {
            if (deleted === refState.getValue()) {
                refState.setValue(null);
            }
        });
        return refState;
    }
    private createRefs(table: RDBTable, refs: RDBRow[]): StateList<RDBRow> {
        const refflist = new StateList(refs);
        table.onDelete((_, deleted) => {
            removeInside(refflist, deleted);
        });
        return refflist;
    }
    private createColumnStructure(type: string): ColumnStructure {
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return {
                type: type,
                values: new WeakMap(),
                verify: (value) => {
                    if (typeof value !== type) {
                        throw new RDBError('TYPE_MISMATCH', type, value);
                    }
                    return true;
                }
            };
        } else {
            const [refftype, refference] = type.split(':');
            if (refftype === 'ref') {
                const ref = this._db.getTableRefference(refference);
                return {
                    type: refftype,
                    values: new WeakMap(),
                    ref: ref,
                    verify(value) {
                        const table = ref.getValue();
                        if (!(table instanceof RDBTable)) {
                            throw new RDBError('REF_FAILED');
                        }
                        if (!(value instanceof RDBRow || value === null)) {
                            throw new RDBError('REF_INVALID_TYPE');
                        }
                        if (value && !table.hasRow(value)) {
                            throw new RDBError('REF_ROW_DELETED');
                        }
                        return true;
                    }
                };
            } else if (refftype === 'refs') {
                return {
                    type: refftype,
                    values: new WeakMap(),
                    ref: this._db.getTableRefference(refference),
                    verify() {
                        throw new RDBError('ILLEGAL_REFS_SET');
                    }
                };
            } else {
                throw new RDBError('INVALID_TYPE', type);
            }
        }
    }
}
