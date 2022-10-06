import RDB from '../src/db/RDB';

export default class RDBJsonAdapter {
    db: RDB = new RDB();

    async fetchJson(url: string, tablename: string, schema: object) {
        try {
            const table = this.db.createTable(tablename, schema);
            const fetched = await fetch(url);
            const json = await fetched.json();
            table.insertAll(json);
        } catch (err) {
            console.log(err);
        }
    }
}
