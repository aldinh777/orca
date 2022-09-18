const { default: RDB } = require('../src/RDB');

describe('Reactive Database', () => {
    const db = new RDB();
    const vb = db.createViewBuilder();
    const sampleStructure = {
        name: 'string',
        age: 'number',
        randomShit: 'string?',
        randomNumber: 'number?'
    };
    const sampleData = [
        {
            name: 'aldi',
            age: 25,
            randomShit: 'asadwajaskhdkajds',
            randomNumber: 13123123
        },
        {
            name: 'nina',
            age: 13,
            randomShit: 'sasaladla'
        },
        {
            name: 'bayu',
            age: 32,
            randomNumber: 123123123
        },
        {
            name: 'yudha',
            age: 15
        }
    ];
    describe('Table Operations', () => {
        let users;
        test('table creation', () => {
            users = db.createTable('user', sampleStructure);
        });
        test('table selection', () => {
            const selectedTable = db.selectTable('user');
            expect(users).toBe(selectedTable);
        });
        test('table rows insertion', () => {
            const users = db.selectTable('user');
            const rows = users.insertAll(sampleData);
            expect(rows.length).toBe(4);
        });
        test('table rows selection', () => {
            const users = db.selectTable('user');
            const rows = users.selectRows('*');
            const adultRows = users.selectRows((row) => row.get('age') > 20);
            expect(rows.length).toBe(4);
            expect(adultRows.length).toBe(2);
        });
        test('table rows update', () => {
            const users = db.selectTable('user');
            const row = users.selectRow(
                (row) => row.get('name') === 'aldi',
                (row) => row.set('age', row.get('age') + 1)
            );
            expect(row.get('age')).toBe(26);
        });
        test('table rows deletion', () => {
            const users = db.selectTable('user');
            users.delete(() => true);
            const rows = users.selectRows('*');
            expect(rows.length).toBe(0);
        });
        test('table deletion', () => {
            db.dropTable('user');
        });
    });
    describe('View Builder', () => {
        test('sample data generations', () => {
            db.createTable('user', sampleStructure).insertAll(sampleData);
        });
        test('select from', () => {
            const users = vb.select('name').from('user').buildView();
            const result = RDB.toObject(users);
            expect(result).toEqual(
                sampleData.map((s) => ({
                    name: s.name
                }))
            );
        });
        test('select from where', () => {
            const users = vb
                .select('name', 'age')
                .from('user')
                .where((row) => row.get('age') > 20)
                .buildView();
            const result = RDB.toObject(users);
            expect(result).toEqual(
                sampleData.filter((s) => s.age > 20).map((s) => ({ name: s.name, age: s.age }))
            );
        });
        /**
         * To do :
         * - viewBuilder sortBy & groupBy
         */
        test('view observability', () => {
            const users = vb
                .select('name', 'age')
                .from('user')
                .where((row) => row.get('age') > 20)
                .buildView();
            const beforeNinaAging = sampleData
                .filter((s) => s.age > 20)
                .map((s) => ({ name: s.name, age: s.age }));
            const afterNinaAging = beforeNinaAging.concat({ name: 'nina', age: 27 });
            const thenBayuShrinking = afterNinaAging.filter((s) => s.name !== 'bayu');
            expect(RDB.toObject(users)).toEqual(beforeNinaAging);
            db.selectTable('user').selectRow(
                (row) => row.get('name') === 'nina',
                (row) => row.set('age', 27)
            );
            expect(RDB.toObject(users)).toEqual(afterNinaAging);
            db.selectTable('user').selectRow(
                (row) => row.get('name') === 'bayu',
                (row) => row.set('age', 10)
            );
            expect(RDB.toObject(users)).toEqual(thenBayuShrinking);
            db.selectTable('user').selectRow(
                (row) => row.get('name') === 'nina',
                (row) => row.set('name', 'bambank')
            );
            expect(RDB.toObject(users)[1].name).toBe('bambank');
        });
    });
});
