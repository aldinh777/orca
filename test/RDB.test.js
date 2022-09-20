const { default: RDB } = require('../src/RDB');

describe('Reactive Database', () => {
    const db = new RDB();
    const sampleStructure = {
        name: 'string',
        age: 'number',
        isekaied: 'boolean'
    };
    const sampleData = [
        {
            name: 'aldi',
            age: 25,
            isekaied: true
        },
        {
            name: 'nina',
            age: 13,
            isekaied: false
        },
        {
            name: 'bayu',
            age: 32
        },
        {
            name: 'yudha',
            age: 15,
            isekaied: true
        }
    ];
    describe('Table Operations', () => {
        let users;
        it('table creation', () => {
            users = db.createTable('user', sampleStructure);
        });
        it('table selection', () => {
            const selectedTable = db.selectTable('user');
            expect(users).toBe(selectedTable);
        });
        it('table rows insertion', () => {
            const users = db.selectTable('user').insertAll(sampleData);
            expect(users.length).toBe(4);
        });
        it('table rows selection', () => {
            const users = db.selectTable('user').selectRows('*');
            const adultUsers = db.selectTable('user').selectRows((row) => row.get('age') > 20);
            expect(users.length).toBe(4);
            expect(adultUsers.length).toBe(2);
        });
        it('table rows update', () => {
            const user = db.selectTable('user').selectRow(
                (row) => row.get('name') === 'aldi',
                (row) => row.set('age', row.get('age') + 1)
            );
            expect(user).not.toBeUndefined();
            expect(user.get('age')).toBe(26);
        });
        it('table rows deletion', () => {
            db.selectTable('user').delete(() => true);
            const users = db.selectTable('user').selectRows('*');
            expect(users.length).toBe(0);
        });
        it('table deletion', () => {
            db.dropTable('user');
        });
    });
    describe('View Builder', () => {
        it('sample data generations', () => {
            db.createTable('user', sampleStructure).insertAll(sampleData);
        });
        it('select from', () => {
            const users = db.query.select('name').from('user').buildView();
            const result = RDB.viewToObject(users);
            expect(result).toEqual(
                sampleData.map((s) => ({
                    name: s.name
                }))
            );
        });
        it('select from where', () => {
            const users = db.query
                .select('name', 'age')
                .from('user')
                .where((row) => row.get('age') > 20)
                .buildView();
            const result = RDB.viewToObject(users);
            expect(result).toEqual(
                sampleData.filter((s) => s.age > 20).map((s) => ({ name: s.name, age: s.age }))
            );
        });
        it.skip('select from orderby', () => {
            const users = db.query.select('name', 'age').from('user').orderBy('age', 'asc');
            expect(RDB.viewToObject(users)[0].name).toBe('nina');
        });
        it('view observability', () => {
            const users = db.query
                .select('name', 'age')
                .from('user')
                .where((row) => row.get('age') > 20)
                .buildView();
            const beforeNinaAging = sampleData
                .filter((s) => s.age > 20)
                .map((s) => ({ name: s.name, age: s.age }));
            const afterNinaAging = beforeNinaAging.concat({ name: 'nina', age: 27 });
            const thenBayuShrinking = afterNinaAging.filter((s) => s.name !== 'bayu');
            expect(RDB.viewToObject(users)).toEqual(beforeNinaAging);
            db.selectTable('user').selectRow(
                (row) => row.get('name') === 'nina',
                (row) => row.set('age', 27)
            );
            expect(RDB.viewToObject(users)).toEqual(afterNinaAging);
            db.selectTable('user').selectRow(
                (row) => row.get('name') === 'bayu',
                (row) => row.set('age', 10)
            );
            expect(RDB.viewToObject(users)).toEqual(thenBayuShrinking);
            db.selectTable('user').selectRow(
                (row) => row.get('name') === 'nina',
                (row) => row.set('name', 'bambank')
            );
            expect(RDB.viewToObject(users)[1].name).toBe('bambank');
        });
    });
});
