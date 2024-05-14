import { state, type State } from '@aldinh777/reactive';
import { list, type ReactiveList } from '@aldinh777/reactive/list';
import { removeInside } from '../help';
import RDBError from '../error/RDBError';
import RDB from './RDB';
import RDBRow from './RDBRow';

export type columnType = 'string' | 'number' | 'boolean' | 'ref' | 'refs';

export interface ColumnStructure {
    type: columnType;
    verify(value: any): boolean;
    ref?: State<RDBTable | string>;
    values: WeakMap<RDBRow, any>;
}

export interface ColumnListener {
    rename: ((oldname: string, newname: string) => void)[];
    modify: ((colname: string, column: ColumnStructure) => void)[];
    add: ((colname: string, column: ColumnStructure) => void)[];
    drop: ((colname: string, column: ColumnStructure) => void)[];
}

export default class RDBTable {
    rows = list<RDBRow>([]);
    private _colupd: ColumnListener = { modify: [], rename: [], add: [], drop: [] };
    private _db: RDB;
    private _columns: Map<string, ColumnStructure> = new Map();

    constructor(db: RDB, columns: object) {
        this._db = db;
        for (const column in columns) {
            const type: string = (columns as any)[column];
            this.addColumn(column, type);
        }
    }
    getName(): string | undefined {
        return this._db.getTableName(this);
    }

    get(id: string): RDBRow | undefined {
        return this.selectRow((row) => row.id === id);
    }
    hasRow(row: RDBRow): boolean {
        return this.rows().includes(row);
    }

    addColumn(name: string, type: string): void {
        const column = this.createColumnStructure(type);
        this._columns.set(name, column);
        for (const add of this._colupd.add) {
            add(name, column);
        }
    }
    dropColumn(name: string): void {
        if (!this._columns.has(name)) {
            throw new RDBError('COLUMN_DROP_NOT_EXISTS', name, this.getName());
        }
        const column = this._columns.get(name) as ColumnStructure;
        this._columns.delete(name);
        for (const drop of this._colupd.drop) {
            drop(name, column);
        }
    }
    modifyColumn(name: string, type: string): void {
        if (!this._columns.has(name)) {
            throw new RDBError('COLUMN_NOT_EXISTS', name);
        }
        if (this.rows().length > 0) {
            throw new RDBError('COLUMN_IN_DANGER');
        }
        const column = this.createColumnStructure(type);
        this._columns.set(name, column);
        for (const modify of this._colupd.modify) {
            modify(name, column);
        }
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
        for (const rename of this._colupd.rename) {
            rename(oldname, newname);
        }
    }

    onColumnRename(handler: (oldname: string, newname: string) => void): void {
        this._colupd.rename.push(handler);
    }
    onColumnModify(handler: (colname: string, column: ColumnStructure) => void): void {
        this._colupd.modify.push(handler);
    }
    onColumnAdd(handler: (colname: string, column: ColumnStructure) => void): void {
        this._colupd.add.push(handler);
    }
    onColumnDrop(handler: (colname: string, column: ColumnStructure) => void): void {
        this._colupd.drop.push(handler);
    }

    insert(o: object): RDBRow {
        const row = new RDBRow(this, Reflect.get(o, 'id'));
        // Iterate to be insert object and verify item
        for (const colname in o) {
            const value = (o as any)[colname];
            const column = this._columns.get(colname);
            if (colname === 'id') {
                continue;
            }
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
        this.rows.push(row);
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
        const rawlist = this.rows();
        const dellist = rawlist.filter(filter === '*' ? () => true : filter);
        for (const delrow of dellist) {
            const index = this.rows().indexOf(delrow);
            this.rows.splice(index, 1);
        }
    }
    selectRow(filter: (row: RDBRow) => boolean, callback?: (row: RDBRow) => void): RDBRow | undefined {
        for (const row of this.rows()) {
            if (filter(row)) {
                if (callback) {
                    callback(row);
                }
                return row;
            }
        }
    }
    selectRows(filter: '*' | ((row: RDBRow) => boolean), callback?: (row: RDBRow) => void): RDBRow[] {
        const rawlist = this.rows();
        const rows = filter === '*' ? [...rawlist] : rawlist.filter(filter);
        if (callback) {
            for (const row of rows) {
                callback(row);
            }
        }
        return rows;
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

    private validateRefTable(ref: State<string | RDBTable> | undefined): RDBTable {
        if (!ref) {
            throw new RDBError('TABLE_REF_INVALIDATED', this.getName());
        }
        const table = ref();
        if (typeof table === 'string') {
            throw new RDBError('TABLE_REF_UNRESOLVED', this.getName(), table);
        }
        return table;
    }

    private createRef(table: RDBTable, ref?: RDBRow): State<RDBRow | null> {
        const refState = state(ref || null);
        table.rows.onDelete((_, deleted) => {
            if (deleted === refState()) {
                refState(null);
            }
        });
        return refState;
    }
    private createRefs(table: RDBTable, refs: RDBRow[]): ReactiveList<RDBRow> {
        const refflist = list(refs);
        table.rows.onDelete((_, deleted) => {
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
                        const table = ref();
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
    static drop(table: RDBTable): void {
        table.delete('*');
        table._columns.clear();
        table._colupd.rename = [];
        table._colupd.modify = [];
        table._colupd.add = [];
        table._colupd.drop = [];
    }
}
