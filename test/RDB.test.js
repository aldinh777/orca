const { default: RDB } = require('../src/db/RDB');

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
});
