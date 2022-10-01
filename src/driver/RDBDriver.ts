import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import RDB from '../db/RDB';

/**
 *  _rdb_[db]
 *      structures
 *          [table].json        > structure
 *      values
 *          [table]
 *              [column]
 *                  [row id]    > value
 */
export default class RDBDriver {
    path: string;
    db: RDB;

    constructor(name: string = 'default', path: string = process.cwd()) {
        const dbpath = join(path, `_rdb_${name}`);
        const db = new RDB();
        this.path = dbpath;
        this.db = db;

        db.onTableCreate((name, table) => {
            // do some suspicious thing to the table
            table.eachColumn((name, column) => {
                // column init maybe
            });
            table.onColumnRename((oldname, newname) => {
                // what todo when column renamed?
            });
            table.onColumnAdd((name, column) => {
                // coladd
            });
            table.onColumnDrop((name, column) => {
                // cool and drip
            });
            table.onColumnModify((name, column) => {
                // column modified
            });

            //do something 'dangeraus' to items
            table.selectRows('*', (row) => {
                // rows init pelhaps
            });
            table.onInsert((row) => {
                // on row inselt
            });
            table.onDelete((row) => {
                // on low delete
            });
            // uwu
        });
        db.onTableDrop((name, table) => {
            // what to do when table drop?
            // yeah, remove all files with said name
        });

        if (existsSync(dbpath)) {
            // code for reading existing db
        } else {
            mkdirSync(join(dbpath, 'structures'), { recursive: true });
            mkdirSync(join(dbpath, 'values'), { recursive: true });
        }
    }
}
