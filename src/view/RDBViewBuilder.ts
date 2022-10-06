import RDBError from '../error/RDBError';
import RDB from '../db/RDB';
import RDBRow from '../db/RDBRow';
import RDBView, { ViewQuery } from './RDBView';

export default class RDBViewBuilder {
    private _db: RDB;
    private _table?: string;
    private _props: ViewQuery[] = [];
    private _filter?: (row: RDBRow) => boolean;
    private _sorters?: [field: string, order: 'asc' | 'desc'];

    constructor(db: RDB) {
        this._db = db;
    }

    private clone(): RDBViewBuilder {
        const builder = new RDBViewBuilder(this._db);
        builder._table = this._table;
        builder._props = [...this._props];
        builder._filter = this._filter;
        return builder;
    }
    from(table: string): RDBViewBuilder {
        const builder = this.clone();
        builder._table = table;
        return builder;
    }
    select(...columns: ViewQuery[]): RDBViewBuilder {
        const builder = this.clone();
        builder._props = columns;
        return builder;
    }
    where(filter: (row: RDBRow) => boolean): RDBViewBuilder {
        const builder = this.clone();
        builder._filter = filter;
        return builder;
    }
    orderBy(column: string, order: 'asc' | 'desc' = 'asc'): RDBViewBuilder {
        const builder = this.clone();
        builder._sorters = [column, order];
        return builder;
    }
    build(): RDBView {
        if (!this._table) {
            throw new RDBError('TABLE_NOT_SPECIFIED');
        }
        const table = this._db.selectTable(this._table);
        return new RDBView(this._db, table, this._props, this._filter, this._sorters);
    }
}