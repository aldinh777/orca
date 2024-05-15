import { state, type State } from '@aldinh777/reactive';
import { list, type ReactiveList } from '@aldinh777/reactive/list';
import { removeInside } from '../help';
import OrcaError from '../error/OrcaError';
import Cache from './Cache';
import Row from './Row';

export type ColumnTypeName = 'string' | 'number' | 'boolean' | 'ref' | 'refs';
export type ColumnType = string | number | boolean | State<Row | null> | ReactiveList<Row>;

export interface ColumnStructure {
    type: ColumnTypeName;
    verify(value: any): boolean;
    ref?: State<Model | string>;
    values: WeakMap<Row, ColumnType>;
}

export interface ColumnListener {
    rename: ((oldName: string, newName: string) => void)[];
    modify: ((columnName: string, column: ColumnStructure) => void)[];
    add: ((columnName: string, column: ColumnStructure) => void)[];
    drop: ((columnName: string, column: ColumnStructure) => void)[];
}

export default class Model {
    rows = list<Row>([]);
    private _colupd: ColumnListener = { modify: [], rename: [], add: [], drop: [] };
    private _db: Cache;
    private _columns: Map<string, ColumnStructure> = new Map();

    constructor(db: Cache, columns: object) {
        this._db = db;
        for (const column in columns) {
            const type: string = (columns as any)[column];
            this.addColumn(column, type);
        }
    }
    getName(): string | undefined {
        return this._db.getModelName(this);
    }

    get(id: string): Row | undefined {
        return this.selectRow((row) => row.id === id);
    }
    hasRow(row: Row): boolean {
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
            throw new OrcaError('COLUMN_DROP_NOT_EXISTS', name, this.getName());
        }
        const column = this._columns.get(name) as ColumnStructure;
        this._columns.delete(name);
        for (const drop of this._colupd.drop) {
            drop(name, column);
        }
    }
    modifyColumn(name: string, type: string): void {
        if (!this._columns.has(name)) {
            throw new OrcaError('COLUMN_NOT_EXISTS', name);
        }
        if (this.rows().length > 0) {
            throw new OrcaError('COLUMN_IN_DANGER');
        }
        const column = this.createColumnStructure(type);
        this._columns.set(name, column);
        for (const modify of this._colupd.modify) {
            modify(name, column);
        }
    }
    renameColumn(oldName: string, newName: string): void {
        if (!this._columns.has(oldName)) {
            throw new OrcaError('COLUMN_RENAME_NOT_EXISTS', oldName, this.getName());
        }
        if (this._columns.has(newName)) {
            throw new OrcaError('COLUMN_RENAME_TARGET_EXISTS', oldName, newName, this.getName());
        }
        const column = this._columns.get(oldName) as ColumnStructure;
        this._columns.delete(oldName);
        this._columns.set(newName, column);
        for (const rename of this._colupd.rename) {
            rename(oldName, newName);
        }
    }

    onColumnRename(handler: (oldName: string, newName: string) => void): void {
        this._colupd.rename.push(handler);
    }
    onColumnModify(handler: (columnName: string, column: ColumnStructure) => void): void {
        this._colupd.modify.push(handler);
    }
    onColumnAdd(handler: (columnName: string, column: ColumnStructure) => void): void {
        this._colupd.add.push(handler);
    }
    onColumnDrop(handler: (columnName: string, column: ColumnStructure) => void): void {
        this._colupd.drop.push(handler);
    }

    insert(o: object): Row {
        const row = new Row(this, Reflect.get(o, 'id'));
        // Iterate to be insert object and verify item
        for (const columnName in o) {
            const value = (o as any)[columnName];
            const column = this._columns.get(columnName);
            if (columnName === 'id') {
                continue;
            }
            if (!column) {
                throw new OrcaError('INSERT_INVALID_COLUMN', columnName, this.getName(), o);
            }
            const { type, verify, values, ref } = column;
            if (type === 'ref' || type === 'refs') {
                const model = this.validateRefModel(ref);
                if (type === 'ref') {
                    if (typeof value !== 'object') {
                        throw new OrcaError('INSERT_INVALID_REF', columnName);
                    }
                    const ref = model.insert(value);
                    const refState = this.createRef(model, ref);
                    values.set(row, refState);
                } else if (type === 'refs') {
                    if (!(value instanceof Array)) {
                        throw new OrcaError('INSERT_INVALID_REFS', columnName);
                    }
                    const refs = model.insertAll(value);
                    const refferences = this.createRefs(model, refs);
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
                        values.set(row, this.createRef(this.validateRefModel(ref)));
                        break;
                    case 'refs':
                        values.set(row, this.createRefs(this.validateRefModel(ref), []));
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
                        throw new OrcaError('WHAT_IS_HAPPENING', type);
                }
            }
        });
        this.rows.push(row);
        return row;
    }
    insertAll(obs: object[]): Row[] {
        const inserteds: Row[] = [];
        for (const o of obs) {
            inserteds.push(this.insert(o));
        }
        return inserteds;
    }
    delete(filter: '*' | ((row: Row) => boolean)): void {
        const rawlist = this.rows();
        const dellist = rawlist.filter(filter === '*' ? () => true : filter);
        for (const delrow of dellist) {
            const index = this.rows().indexOf(delrow);
            this.rows.splice(index, 1);
        }
    }
    selectRow(filter: (row: Row) => boolean, callback?: (row: Row) => void): Row | undefined {
        for (const row of this.rows()) {
            if (filter(row)) {
                if (callback) {
                    callback(row);
                }
                return row;
            }
        }
    }
    selectRows(filter: '*' | ((row: Row) => boolean), callback?: (row: Row) => void): Row[] {
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
    getColumn(columnName: string): ColumnStructure {
        const column = this._columns.get(columnName);
        if (!column) {
            throw new OrcaError('INVALID_COLUMN', columnName);
        }
        return column;
    }

    private validateRefModel(ref: State<string | Model> | undefined): Model {
        if (!ref) {
            throw new OrcaError('MODEL_REF_INVALIDATED', this.getName());
        }
        const model = ref();
        if (typeof model === 'string') {
            throw new OrcaError('MODEL_REF_UNRESOLVED', this.getName(), model);
        }
        return model;
    }

    private createRef(model: Model, ref?: Row): State<Row | null> {
        const refState = state(ref || null);
        model.rows.onDelete((_, deleted) => {
            if (deleted === refState()) {
                refState(null);
            }
        });
        return refState;
    }
    private createRefs(model: Model, refs: Row[]): ReactiveList<Row> {
        const refflist = list(refs);
        model.rows.onDelete((_, deleted) => {
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
                        throw new OrcaError('TYPE_MISMATCH', type, value);
                    }
                    return true;
                }
            };
        } else {
            const [refftype, refference] = type.split(':');
            if (refftype === 'ref') {
                const ref = this._db.getModelRelation(refference);
                return {
                    type: refftype,
                    values: new WeakMap(),
                    ref: ref,
                    verify(value) {
                        const model = ref();
                        if (!(model instanceof Model)) {
                            throw new OrcaError('REF_FAILED');
                        }
                        if (!(value instanceof Row || value === null)) {
                            throw new OrcaError('REF_INVALID_TYPE');
                        }
                        if (value && !model.hasRow(value)) {
                            throw new OrcaError('REF_ROW_DELETED');
                        }
                        return true;
                    }
                };
            } else if (refftype === 'refs') {
                return {
                    type: refftype,
                    values: new WeakMap(),
                    ref: this._db.getModelRelation(refference),
                    verify() {
                        throw new OrcaError('ILLEGAL_REFS_SET');
                    }
                };
            } else {
                throw new OrcaError('INVALID_TYPE', type);
            }
        }
    }
    static drop(model: Model): void {
        model.delete('*');
        model._columns.clear();
        model._colupd.rename = [];
        model._colupd.modify = [];
        model._colupd.add = [];
        model._colupd.drop = [];
    }
}
