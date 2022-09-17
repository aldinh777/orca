import { StateCollection } from '@aldinh777/reactive/collection';
import RDRow from './RDRow';

export interface TableStructure {
    [type: string]: string;
}

/**
 * This shit needs to implements update listeners
 */
export default class RDTable extends StateCollection<string, RDRow, RDRow[]> {
    name: string;
    structure: TableStructure = {};
    private _verifier: Map<string, (value: any) => boolean> = new Map();

    constructor(name: string, format: object) {
        super();
        this.raw = [];
        this.name = name;
        for (const column in format) {
            const type: string = (format as any)[column];
            if (
                type === 'string' ||
                type === 'string?' ||
                type === 'number' ||
                type === 'number?'
            ) {
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
                        `nonvalid type '${type}' for column '${column}' when creating table '${name}'`
                    );
                }
                this._verifier.set(column, (value) => {
                    throw Error(`refferences cannot be set directly, we have procedure for it`);
                });
            }
            this.structure[column] = type;
        }
    }

    get(index: string): RDRow | undefined {
        throw new Error('Method not implemented, on purpose.');
    }
    set(index: string, value: RDRow): this {
        throw new Error('Method not implemented, on purpose.');
    }

    insert(o: object): void {
        const row = new RDRow();
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
            row.set(column, value);
        }
        for (const column in this.structure) {
            const optional = this.structure[column].slice(6);
            if (!row.has(column)) {
                if (optional) {
                    row.set(column, undefined);
                } else {
                    throw Error(
                        `pls fill column '${column}' bcs it's mandatory for when insert into table '${this.name}'\n` +
                            `=== the object in question ===\n${JSON.stringify(o, null, 2)}\n` +
                            `=== expected structure ===\n${JSON.stringify(this.structure, null, 2)}`
                    );
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
    }
    insertAll(obs: object[]) {
        for (const o of obs) {
            this.insert(o);
        }
    }
    delete(filter: (row: RDRow) => boolean): void {
        const rawlist = this.raw;
        const dellist = rawlist.filter(filter);
        for (const del of dellist) {
            const index = rawlist.indexOf(del);
            this.raw.splice(index, 1);
        }
    }
    selectRow(filter: (row: RDRow) => boolean, callback?: (row: RDRow) => any): RDRow | undefined {
        for (const row of this.raw) {
            if (filter(row)) {
                if (callback) {
                    callback(row);
                }
                return row;
            }
        }
    }
    selectRows(filter: '*' | ((row: RDRow) => boolean), callback?: (row: RDRow) => any): RDRow[] {
        const rawlist = this.raw;
        let rows;
        if (filter === '*') {
            rows = [...rawlist];
        } else {
            rows = rawlist.filter(filter);
        }
        if (callback) {
            for (const row of rows) {
                callback(row);
            }
        }
        return rows;
    }
}
