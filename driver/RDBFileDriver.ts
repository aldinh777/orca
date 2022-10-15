import { State } from '@aldinh777/reactive/state/State';
import { StateList } from '@aldinh777/reactive/collection/StateList';
import { join } from 'path';
import {
    existsSync,
    mkdirSync,
    rmSync,
    readFileSync,
    writeFileSync,
    renameSync,
    readdirSync
} from 'fs';
import RDBTable, { ColumnStructure } from '../src/db/RDBTable';
import RDB from '../src/db/RDB';
import RDBRow from '../src/db/RDBRow';

/**
 *  _rdb_[db]
 *      structures
 *          [table].json        > structure
 *      values
 *          [table]
 *              [column]
 *                  [row id]    > value
 */
export default class RDBFileDriver {
    path: string;
    db: RDB;

    constructor(name: string = 'default', path: string = process.cwd()) {
        const dbpath = join(path, `_rdb_${name}`);
        const db = new RDB();
        this.path = dbpath;
        this.db = db;

        if (existsSync(dbpath)) {
            const tables = readdirSync(join(dbpath, 'structures'));
            for (const tablejson of tables) {
                const structureText = readFileSync(join(dbpath, 'structures', tablejson));
                const structure = JSON.parse(structureText.toString('utf8'));
                const [tablename] = tablejson.split('.json');
                const table = db.createTable(tablename, structure);
                const rawvalues: Map<string, any> = new Map();
                table.eachColumn(RDBFileDriver.setRowNatives(table, dbpath, rawvalues));
                const ravvvaluesbutarray = Array.from(rawvalues.values());
                table.insertAll(ravvvaluesbutarray);
            }
            for (const tablejson of tables) {
                const [tablename] = tablejson.split('.json');
                const table = db.selectTable(tablename);
                table.eachColumn(RDBFileDriver.setRowRefs(table, dbpath));
            }
        } else {
            mkdirSync(join(dbpath, 'structures'), { recursive: true });
            mkdirSync(join(dbpath, 'values'), { recursive: true });
        }

        db.eachTable((_, table) => RDBFileDriver.observeTable(table, this.path));
        db.onTableCreate((_, table) => RDBFileDriver.observeTable(table, this.path));
        db.onTableDrop((name) => {
            rmSync(join(dbpath, 'structures', `${name}.json`));
            rmSync(join(dbpath, 'values', name), { recursive: true });
        });
        db.onTableRename((oldname: string, newname: string) => {
            const oldvadir = join(dbpath, 'values', oldname);
            const newvadir = join(dbpath, 'values', newname);
            const oldpath = join(dbpath, 'structures', `${oldname}.json`);
            const newpath = join(dbpath, 'structures', `${newname}.json`);
            renameSync(oldvadir, newvadir);
            renameSync(oldpath, newpath);
        });
    }

    ensureTable(tablename: string, schema: object) {
        if (!this.db.hasTable(tablename)) {
            this.db.createTable(tablename, schema);
        }
    }

    private static setRowNatives(
        table: RDBTable,
        dbpath: string,
        rawvalues: Map<string, any>
    ): (colname: string, column: ColumnStructure) => void {
        return (colname, { type }) => {
            const tablename = table.getName();
            if (!tablename) {
                throw Error('Invalid Table Name');
            }
            const ids = readdirSync(join(dbpath, 'values', tablename, colname));
            for (const id of ids) {
                const valueText = readFileSync(join(dbpath, 'values', tablename, colname, id));
                const valve = rawvalues.get(id) || {};
                if (!valve.id) {
                    valve.id = id;
                    rawvalues.set(id, valve);
                }
                if (type === 'string') {
                    valve[colname] = valueText.toString();
                } else if (type === 'number') {
                    const valueNumber = parseFloat(valueText.toString());
                    valve[colname] = valueNumber;
                } else if (type === 'boolean') {
                    valve[colname] = valueText.toString() === 'true';
                }
            }
        };
    }
    private static setRowRefs(
        table: RDBTable,
        dbpath: string
    ): (colname: string, column: ColumnStructure) => void {
        return (colname, { type, ref }) => {
            const tablename = table.getName();
            if (!tablename) {
                throw Error('Invalid Table Name');
            }
            const ids = readdirSync(join(dbpath, 'values', tablename, colname));
            for (const id of ids) {
                const valueText = readFileSync(join(dbpath, 'values', tablename, colname, id));
                if (!ref) {
                    return;
                }
                const reftable = ref.getValue();
                if (typeof reftable === 'string') {
                    return;
                }
                if (type === 'ref') {
                    const row = table.get(id);
                    const ref = reftable.get(valueText.toString());
                    if (ref) {
                        row?.set(colname, ref);
                    }
                } else if (type === 'refs') {
                    const rowids = valueText.toString().split('\n');
                    const refs = rowids
                        .map((id) => reftable.get(id))
                        .filter((r) => r !== undefined) as RDBRow[];
                    const row = table.get(id);
                    row?.addRefs(colname, ...refs);
                }
            }
        };
    }
    private static observeTable(table: RDBTable, dbpath: string) {
        // do some suspicious thing to the table
        const tablename = table.getName();
        if (!tablename) {
            throw Error(`Invalid Table Name`);
        }
        const structure: any = {};
        const rewriteTableJson = (tablename: string) => {
            if (!tablename) {
                throw Error('Table name invalid');
            }
            writeFileSync(
                join(dbpath, 'structures', `${tablename}.json`),
                JSON.stringify(structure, null, 2),
                'utf8'
            );
        };
        table.eachColumn((name, column) => {
            structure[name] = RDBFileDriver.getColumnInfo(column);
            mkdirSync(join(dbpath, 'values', tablename, name), { recursive: true });
        });
        rewriteTableJson(tablename);
        table.onColumnRename((oldname, newname) => {
            structure[newname] = structure[oldname];
            delete structure[oldname];
            rewriteTableJson(table.getName() || '');
            renameSync(join(dbpath, 'values', oldname), join(dbpath, 'values', newname));
        });
        table.onColumnAdd((name, column) => {
            structure[name] = RDBFileDriver.getColumnInfo(column);
            rewriteTableJson(table.getName() || '');
            mkdirSync(join(dbpath, 'values', name), { recursive: true });
        });
        table.onColumnDrop((name) => {
            delete structure[name];
            rewriteTableJson(table.getName() || '');
            rmSync(join(dbpath, 'values', name), { recursive: true });
        });
        table.onColumnModify((name, column) => {
            structure[name] = RDBFileDriver.getColumnInfo(column);
            rewriteTableJson(table.getName() || '');
        });
        //do something 'dangeraus' to items
        const writeValue = (colname: string, id: string, value: string) => {
            const tablename = table.getName();
            if (!tablename) {
                throw Error('table wrongfully victimized');
            }
            writeFileSync(join(dbpath, 'values', tablename, colname, id), value, 'utf8');
        };
        table.onInsert((id, row) => {
            table.eachColumn((colname, column) => {
                writeValue(colname, id, RDBFileDriver.getTextValue(column, row));
            });
        });
        table.onDelete((id) => {
            table.eachColumn((colname) => {
                const tablename = table.getName();
                if (!tablename) {
                    throw Error('undeletable resource');
                }
                rmSync(join(dbpath, 'values', tablename, colname, id));
            });
        });
        // uwu
    }
    private static getColumnInfo({ type, ref }: ColumnStructure): string {
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return type;
        } else if (ref) {
            const tabref = ref.getValue();
            if (typeof tabref === 'string') {
                return `${type}:${tabref}`;
            } else {
                const tabname = tabref.getName();
                if (tabname) {
                    return `${type}:${tabname}`;
                } else {
                    throw Error('referenced table lost');
                }
            }
        } else {
            throw Error('reference lost');
        }
    }
    private static getTextValue({ type, values }: ColumnStructure, row: RDBRow): string {
        const value = values.get(row);
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return value.toString();
        } else if (type === 'ref') {
            const ref = (value as State<RDBRow | null>).getValue();
            return ref ? ref.id : '';
        } else if (type === 'refs') {
            const refs = (value as StateList<RDBRow>).raw;
            return refs.map((row) => row.id).join('\n');
        } else {
            throw Error('row has invalid column type');
        }
    }
}
