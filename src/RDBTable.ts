import { State } from '@aldinh777/reactive';
import { StateCollection, StateList } from '@aldinh777/reactive/collection';
import RDB from './RDB';
import RDBRow from './RDBRow';

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
    getName() {
        return this._db.getTableName(this);
    }

    get(id: string): RDBRow | undefined {
        return this.selectRow((row) => row.get('id') === id);
    }
    set(_id: string, _value: RDBRow): this {
        throw new Error('Method not implemented, on purpose!');
    }
    hasRow(row: RDBRow) {
        return this.raw.includes(row);
    }

    addColumn(name: string, type: string) {
        this._columns.set(name, this.createColumnStructure(type));
    }
    dropColumn(name: string) {
        if (this._columns.has(name)) {
            this._columns.delete(name);
        } else {
            throw Error(
                `column to delete '${name}' never cease ` +
                    `to exists anywhere on table ${this.getName()}`
            );
        }
    }
    modifyColumn(name: string, type: string) {
        if (this._columns.has(name)) {
            if (this.raw.length > 0) {
                throw Error(
                    `so sorry, but this table have data inside. we afraid changing any column type ` +
                        `could summon chaos, thus we are strictly told not to allow column to be modify ` +
                        `when data is exists. very sorry for this.`
                );
            }
            this._columns.set(name, this.createColumnStructure(type));
        } else {
            throw Error(
                `success is nothing but lies. column '${name}' not modified, apparently ` +
                    `this database is blind and cannot find any column with that name. ` +
                    `we sincerenly apologize for our lack of competence :(`
            );
        }
    }
    renameColumn(oldname: string, newname: string) {
        if (this._columns.has(oldname)) {
            if (this._columns.has(newname)) {
                throw Error(
                    `failed rename column: targetname already exists\n` +
                        `table: '${this.getName()}'\n` +
                        `oldname: '${oldname}', newname: '${newname}'`
                );
            }
            const column = this._columns.get(oldname) as ColumnStructure;
            this._columns.delete(oldname);
            this._columns.set(newname, column);
        } else {
            throw Error(
                `rename column failed: column to rename not exists\n` +
                    `table: '${this.getName()}'\n` +
                    `column to rename: '${oldname}'`
            );
        }
    }

    insert(o: object): RDBRow {
        const row = new RDBRow(this._columns);
        // Iterate to be insert object and verify item
        for (const colname in o) {
            const value = (o as any)[colname];
            const column = this._columns.get(colname);
            if (!column) {
                throw Error(
                    `imvalid column '${colname}' when insert into table '${this.getName()}'\n` +
                        `=== the object in question ===\n${JSON.stringify(o, null, 2)}`
                );
            }
            const { type, verify, values, ref } = column;
            verify(value);
            if (type === 'ref' || type === 'refs') {
                if (!ref) {
                    throw Error(
                        `somehow table refference lost ` +
                            `at table '${this.getName()}' column $'{colname}'`
                    );
                }
                const table = ref.getValue();
                if (typeof table === 'string') {
                    throw Error(
                        `table refference not yet resolved. ` +
                            `still waiting for table '${table}' to be created. \n` +
                            `waiter: '${this.getName()}':'${colname}'`
                    );
                }
                if (type === 'ref') {
                    if (!table.hasRow(value)) {
                        throw Error('table mismatch when setting reference value');
                    }
                    const ref = table.insert(value);
                    const refState = new State(ref) as State<RDBRow | null>;
                    values.set(row, refState);
                    table.onDelete((_, deleted) => {
                        if (deleted === refState.getValue()) {
                            refState.setValue(null);
                        }
                    });
                } else if (type === 'refs') {
                    const refs = table.insertAll(value);
                    const refferences = new StateList(refs);
                    values.set(row, refferences);
                    table.onDelete((_, deleted) => {
                        const index = refferences.raw.indexOf(deleted);
                        if (index !== -1) {
                            refferences.splice(index, 1);
                        }
                    });
                }
            } else {
                values.set(row, value);
            }
        }
        // Iterate structure ensure everything mandatory is filled
        this._columns.forEach((column) => {
            const { type, values } = column;
            if (!values.has(row)) {
                switch (type) {
                    case 'ref':
                        values.set(row, null);
                        break;
                    case 'refs':
                        values.set(row, new StateList());
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
                        throw Error(
                            `this is not supposed to be happen!` +
                                ` invalid column type when inserting data '${type}'`
                        );
                }
            }
        });
        this.raw.push(row);
        for (const ins of this._ins) {
            ins(row.id, row);
        }
        return row;
    }
    insertAll(obs: object[]): RDBRow[] {
        const inserteds: RDBRow[] = [];
        for (const o of obs) {
            inserteds.push(this.insert(o));
        }
        return inserteds;
    }
    delete(filter: (row: RDBRow) => boolean): void {
        const rawlist = this.raw;
        const dellist = rawlist.filter(filter);
        for (const delrow of dellist) {
            const index = rawlist.indexOf(delrow);
            this.raw.splice(index, 1);
            for (const del of this._del) {
                del(delrow.id, delrow);
            }
        }
    }
    selectRow(
        filter: (row: RDBRow) => boolean,
        callback?: (row: RDBRow) => any
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
        callback?: (row: RDBRow) => any
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

    private createColumnStructure(type: string): ColumnStructure {
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return {
                type: type,
                values: new WeakMap(),
                verify: (value) => {
                    if (typeof value === type) {
                        return true;
                    } else {
                        throw Error(
                            `unmatching type when setting value. \n` +
                                `expected: '${type}', reality: '${typeof value}'`
                        );
                    }
                }
            };
        } else {
            const [refftype, refference] = type.split(':');
            if (refftype === 'ref') {
                return {
                    type: refftype,
                    values: new WeakMap(),
                    ref: this._db.getTableRefference(refference),
                    verify: (value) => {
                        if (value instanceof RDBRow || value === null) {
                            return true;
                        } else {
                            throw Error(`invalid refference type. allowed: RDBRow | null`);
                        }
                    }
                };
            } else if (refftype === 'refs') {
                return {
                    type: refftype,
                    values: new WeakMap(),
                    ref: this._db.getTableRefference(refference),
                    verify: () => {
                        throw Error(
                            `setting references through method '[row].set()' is not allowed.` +
                                `use '[row].addRefs()' or '[row].deleteRefs()' instead to modify refferences`
                        );
                    }
                };
            } else {
                throw Error(`nonvalid type '${type}' when creating column`);
            }
        }
    }
}
