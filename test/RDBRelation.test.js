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
    describe('View Labor', () => {
        // reset data
        db.selectTable('person').delete(() => true);
        db.selectTable('phone').delete(() => true);
        it('has valid phone and oshis', () => {
            db.selectTable('person').insertAll(sampleData);
            const persons = db.query
                .select('name', ['phone', 'model'], ['oshis', 'name'])
                .from('person')
                .build();
            const reed = RDB.freezeView(persons);
            expect(reed[0]['phone']['model']).toBe('nookiea');
            expect(reed[3]['oshis'][0]['name']).toBe('ennaur');
            expect(reed[3]['oshis'][1]['name']).toBe('ewiwa');
        });
        it('also works the other ways', () => {
            const persons = db.query
                .select('name', ['person#oshis', 'name'])
                .from('person')
                .build();
            const phones = db.query.select('model', ['person#phone', 'name']).from('phone').build();
            const reed = RDB.freezeView(phones);
            const reedus = RDB.freezeView(persons);
            expect(reed[0]['person#phone'][0]['name']).toBe('ookie');
            expect(reedus[1]['person#oshis'][0]['name']).toBe('millei');
            expect(reedus[2]['person#oshis'][0]['name']).toBe('millei');
        });
        it('watch reference update', () => {
            const pelsons = db.query.select('name', ['oshis', 'name']).from('person').build();
            const persons = db.query
                .select('name', ['person#oshis', 'name'])
                .from('person')
                .build();
            const phones = db.query.select('model', ['person#phone', 'name']).from('phone').build();
            db.selectTable('person').selectRow(
                (row) => row.get('name') === 'ookie',
                (row) => row.set('phone', null)
            );
            db.selectTable('person').selectRow(
                (row) => row.get('name') === 'millei',
                (row) => row.deleteRefs('oshis', (ref) => ref.get('name') === 'ennaur')
            );
            const reed = RDB.freezeView(phones);
            const reedus = RDB.freezeView(persons);
            const leedus = RDB.freezeView(pelsons);
            expect(reed[0]['person#phone'].length).toBe(0);
            expect(reedus[1]['person#oshis'].length).toBe(0);
            expect(reedus[2]['person#oshis'][0]['name']).toBe('millei');
            expect(leedus[3]['oshis'].length).toBe(1);
        });
    });
});
