import { StateCollection } from '@aldinh777/reactive/collection';
import RDB from './RDB';
import RDBRow from './RDBRow';

export interface TableStructure {
    [type: string]: string;
}

export default class RDBTable extends StateCollection<string, RDBRow, RDBRow[]> {
    db: RDB;
    name: string;
    structure: TableStructure = {};
    private _verifier: Map<string, (value: any) => boolean> = new Map();

    constructor(db: RDB, name: string, structure: object) {
        super();
        this.db = db;
        this.name = name;
        this.raw = [];
        for (const column in structure) {
            const type: string = (structure as any)[column];
            this.addColumn(column, type);
        }
    }

    get(id: string): RDBRow | undefined {
        return this.selectRow((row) => row.get('id') === id);
    }
    set(id: string, value: RDBRow): this {
        throw new Error('Method not implemented, on purpose!');
    }

    addColumn(column: string, type: string) {
        if (type === 'string' || type === 'string?' || type === 'number' || type === 'number?') {
            const expected = type.slice(0, 6);
            const optional = type.slice(6);
            this._verifier.set(column, (value) => {
                if (optional && value === undefined) {
                    return true;
                } else if (typeof value === expected) {
                    return true;
                } else {
                    throw Error(
                        `unvalid type at column '${column}' in table ${
                            this.name
                        }. expected: '${expected}', reality: '${typeof value}'`
                    );
                }
            });
        } else {
            const [reftype] = type.split(':');
            if (reftype !== 'ref' && reftype !== 'refs') {
                throw Error(
                    `nonvalid type '${type}' for column '${column}' ` +
                        `when creating or altering table '${this.name}'`
                );
            }
            this._verifier.set(column, (value) => {
                if (reftype === 'ref' && typeof value === 'object') {
                    return true;
                } else if (reftype === 'refs' && value instanceof Array) {
                    return true;
                } else {
                    throw Error(
                        `this error is too confusing to explain, will do it later. ` +
                            `here some random thing as hint '${reftype}' ` +
                            `'${JSON.stringify(value)}' '${this.name}'`
                    );
                }
            });
        }
        this.structure[column] = type;
    }
    dropColumn(name: string) {}
    modifyColumn(name: string, type: string) {}
    renameColumn(oldname: string, newname: string) {}

    insert(o: object): RDBRow {
        const row = new RDBRow();
        // Iterate to be insert object and verify item
        for (const column in o) {
            const value = (o as any)[column];
            const verify = this._verifier.get(column);
            if (!verify) {
                throw Error(
                    `imvalid column '${column}' when insert into table '${this.name}'\n` +
                        `=== the object in question ===\n${JSON.stringify(o, null, 2)}\n` +
                        `=== expected structure ===\n${JSON.stringify(this.structure, null, 2)}`
                );
            }
            verify(value);
            const [reftype, target] = this.structure[column].split(':');
            if (reftype === 'ref') {
                const targetTable = this.db.selectTable(target);
                const targetRow = targetTable.insert(value);
                row.setRef(column, targetRow);
            } else if (reftype === 'refs') {
                const targetTable = this.db.selectTable(target);
                const targetRows = targetTable.insertAll(value);
                row.addRefs(column, ...targetRows);
            } else {
                row.set(column, value);
            }
        }
        // Iterate structure ensure everything mandatory is filled
        for (const column in this.structure) {
            const [reftype] = this.structure[column].split(':');
            if (reftype === 'ref' || reftype === 'refs') {
                if (reftype === 'ref' && !row.hasRef(column)) {
                    throw Error(
                        `this is mandatory refference, empty not allowed '${this.name}':'${column}'\n` +
                            `=== to be inserted ===\n` +
                            `${JSON.stringify(o, null, 2)}`
                    );
                } else if (reftype === 'refs' && !row.hasRefs(column)) {
                    throw Error(
                        `this is mandatory refferences, empty not allowed '${this.name}':'${column}'\n` +
                            `=== to be inserted ===\n` +
                            `${JSON.stringify(o, null, 2)}`
                    );
                }
            } else {
                const optional = this.structure[column].slice(6);
                if (!row.has(column)) {
                    if (optional) {
                        row.set(column, undefined);
                    } else {
                        throw Error(
                            `pls fill column '${column}' bcs it's mandatory for when insert into table '${this.name}'\n` +
                                `=== the object in question ===\n${JSON.stringify(o, null, 2)}\n` +
                                `=== expected structure ===\n${JSON.stringify(
                                    this.structure,
                                    null,
                                    2
                                )}`
                        );
                    }
                }
            }
        }
        row.onUpdate((column, value) => {
            const verify = this._verifier.get(column);
            if (!verify) {
                throw Error(
                    `imvalid column '${column}' when update row from table '${this.name}', but how that possible??`
                );
            }
            verify(value);
        });
        row.onResize((_, column) => {
            throw Error(
                `illegal action! attempt to add or delete collumn '${column}' in table '${this.name}'.\n` +
                    `===========================================================\n` +
                    `==========     !!! THOU HATH BEEN WARNED !!!     ==========\n` +
                    `===========================================================\n` +
                    `| forbid us for our intrusion but tis is very important,  |\n` +
                    `| thou are not allowed to alter row structure             |\n` +
                    `| in order to mantain stablity and balance of every data  |\n` +
                    `| in ze database, vve hope thou can having understand     |\n` +
                    `| of why we force this behaviour                          |\n` +
                    `===========================================================\n` +
                    `or probably you just have a little typo, then this is a little embarassing`
            );
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
}
