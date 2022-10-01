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

        if (existsSync(dbpath)) {
            // code for reading existing db
        } else {
            mkdirSync(dbpath);
        }
    }
}
