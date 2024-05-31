import OrcaError from '../error/OrcaError';
import Row from './Row';
import Column from './Column';

export default class Model {
    private rows = new Map<string, Row>();
    private _row_ids = new WeakMap<Row, string>();
    private _name: string;
    private _columns: Map<string, Column> = new Map();
    private _refwaitlist: Set<string> = new Set();

    constructor(name: string, columns: Record<string, Column>) {
        this._name = name;
        for (const columnName in columns) {
            const column = columns[columnName];
            this._columns.set(columnName, column);
        }
    }

    // Direct Row Operations
    get(id: string): Row | undefined {
        return this.selectRow((row) => row.id === id);
    }
    hasRow(row: Row): boolean {
        return this._row_ids.has(row);
    }

    // Row Operations
    insert(objInput: Record<string, any>): Row {
        const row = new Row(this, Reflect.get(objInput, 'id'));
        // Iterate to be insert object and verify item
        for (const columnName in objInput) {
            if (columnName === 'id') {
                continue;
            }
            const value = objInput[columnName];
            const column = this._columns.get(columnName);
            if (!column) {
                throw new OrcaError('INSERT_INVALID_COLUMN', columnName, this._name, objInput);
            }
            column.setValue(row, value);
        }
        this.rows.set(row.id, row);
        this._row_ids.set(row, row.id);
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
        const rawlist = [...this.rows.values()];
        const dellist = rawlist.filter(filter === '*' ? () => true : filter);
        for (const delrow of dellist) {
            const index = this._row_ids.get(delrow);
            if (index) {
                this.rows.delete(index);
                this._row_ids.delete(delrow);
            }
        }
    }
    selectRow(filter: (row: Row) => boolean, callback?: (row: Row) => void): Row | undefined {
        for (const row of this.rows.values()) {
            if (filter(row)) {
                if (callback) {
                    callback(row);
                }
                return row;
            }
        }
    }
    selectRows(filter: '*' | ((row: Row) => boolean), callback?: (row: Row) => void): Row[] {
        const rawlist = [...this.rows.values()];
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
}
