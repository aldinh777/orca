import { state, type State } from '@aldinh777/reactive';
import { list, type ReactiveList } from '@aldinh777/reactive/list';
import { removeInside } from '../help';
import OrcaError from '../error/OrcaError';
import OrcaDB from './OrcaDB';
import Row from './Row';
import Column from './Column';

export default class Model {
    rows = list<Row>([]);
    private _db: OrcaDB;
    private _columns: Map<string, Column> = new Map();

    constructor(db: OrcaDB, columns: object) {
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
    eachColumn(callback: (name: string, column: Column) => void): void {
        this._columns.forEach((column, name) => {
            callback(name, column);
        });
    }
    getColumn(columnName: string): Column {
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
    private createColumnStructure(type: string): Column {
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return new Column(type, (value) => {
                if (typeof value !== type) {
                    throw new OrcaError('TYPE_MISMATCH', type, value);
                }
                return true;
            });
        } else {
            const [refftype, refference] = type.split(':');
            if (refftype === 'ref') {
                const ref = this._db.getModelRelation(refference);
                return new Column(
                    refftype,
                    (value) => {
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
                    },
                    ref
                );
            } else if (refftype === 'refs') {
                return new Column(
                    refftype,
                    () => {
                        throw new OrcaError('ILLEGAL_REFS_SET');
                    },
                    this._db.getModelRelation(refference)
                );
            } else {
                throw new OrcaError('INVALID_TYPE', type);
            }
        }
    }
}
