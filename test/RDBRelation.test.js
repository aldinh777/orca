const { default: RDB } = require('../src/db/RDB');

describe('Reactive DB Relations', () => {
    const db = new RDB();
    const sampleData = [
        {
            name: 'ookie',
            phone: {
                model: 'nookiea'
            }
        },
        {
            name: 'millei',
            oshis: [
                {
                    name: 'ennaur'
                },
                {
                    name: 'ewiwa'
                }
            ]
        }
    ];
    db.createTable('person', {
        name: 'string',
        phone: 'ref:phone',
        oshis: 'refs:person'
    });
    db.createTable('phone', {
        model: 'string'
    });
    db.selectTable('person').insertAll(sampleData);
    describe('Manual Labor', () => {
        it('has valid oshis and phones', () => {
            db.selectTable('person').selectRow(
                (row) => row.get('name') === 'ookie',
                (row) => {
                    const phone = row.get('phone').getValue();
                    expect(phone.get('model')).toBe('nookiea');
                    expect(row.get('oshis').raw.length).toBe(0);
                }
            );
            db.selectTable('person').selectRow(
                (row) => row.get('name') === 'millei',
                (row) => {
                    const phone = row.get('phone').getValue();
                    expect(phone).toBe(null);
                    expect(row.get('oshis').raw.length).toBe(2);
                }
            );
        });
        it('replace phone', () => {
            db.selectTable('person').selectRow(
                (row) => row.get('name') === 'ookie',
                (row) => {
                    row.set('phone', null);
                    const phone = row.get('phone').getValue();
                    expect(phone).toBe(null);
                }
            );
            db.selectTable('person').selectRow(
                (row) => row.get('name') === 'millei',
                (row) => {
                    row.set('phone', db.selectTable('phone').insert({ model: 'motolola' }));
                    const phone = row.get('phone').getValue();
                    expect(phone.get('model')).toBe('motolola');
                }
            );
        });
        it('add or delete oshis', () => {
            db.selectTable('person').selectRow(
                (row) => row.get('name') === 'ookie',
                (row) => {
                    row.addRefs(
                        'oshis',
                        db.selectTable('person').selectRow((row) => row.get('name') === 'ennaur')
                    );
                    expect(row.get('oshis').raw.length).toBe(1);
                }
            );
            db.selectTable('person').selectRow(
                (row) => row.get('name') === 'millei',
                (row) => {
                    row.deleteRefs('oshis', (ref) => ref.get('name') === 'ennaur');
                    expect(row.get('oshis').raw.length).toBe(1);
                }
            );
        });
        it('remove person`s phone depend on existing row', () => {
            db.selectTable('phone').delete((row) => row.get('model') === 'motolola');
            db.selectTable('person').selectRow(
                (row) => row.get('name') === 'millei',
                (row) => {
                    const phone = row.get('phone').getValue();
                    expect(phone).toBe(null);
                }
            );
        });
        it('also remove oshis depend on rows', () => {
            db.selectTable('person').delete((row) => row.get('name') === 'ennaur');
            db.selectTable('person').selectRow(
                (row) => row.get('name') === 'ookie',
                (row) => expect(row.get('oshis').raw.length).toBe(0)
            );
        });
    });
});
