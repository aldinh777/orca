import { describe, expect, it } from 'bun:test';
import DB from '../src/db/Database';

describe('Relational Operations', () => {
    const db = new DB();

    db.createModel('person', {
        name: 'string',
        phone: 'ref:phone',
        friends: 'refs:person'
    });

    db.createModel('phone', {
        model: 'string'
    });

    db.selectModel('person').insertAll([
        {
            name: 'dookie',
            phone: {
                model: 'nookiea'
            }
        },
        {
            name: 'millei',
            friends: [
                {
                    name: 'minttie'
                },
                {
                    name: 'paluy',
                    phone: {
                        model: 'sumsang'
                    }
                }
            ]
        }
    ]);

    it('has valid relations', () => {
        db.selectModel('person').selectRow(
            (row) => row.get('name') === 'dookie',
            (row) => {
                const phone = row.get('phone')();
                expect(phone.get('model')).toBe('nookiea');
                expect(row.get('friends')().length).toBe(0);
            }
        );
        db.selectModel('person').selectRow(
            (row) => row.get('name') === 'millei',
            (row) => {
                const phone = row.get('phone')();
                expect(phone).toBe(null);
                expect(row.get('friends')().length).toBe(2);
            }
        );
    });

    it('update single refference', () => {
        db.selectModel('person').selectRow(
            (row) => row.get('name') === 'dookie',
            (row) => {
                row.set('phone', null);
                const phone = row.get('phone')();
                expect(phone).toBe(null);
            }
        );
        db.selectModel('person').selectRow(
            (row) => row.get('name') === 'millei',
            (row) => {
                row.set('phone', db.selectModel('phone').insert({ model: 'motolola' }));
                const phone = row.get('phone')();
                expect(phone.get('model')).toBe('motolola');
            }
        );
    });

    it('insert and delete refferences', () => {
        db.selectModel('person').selectRow(
            (row) => row.get('name') === 'dookie',
            (row) => {
                row.addRefs('friends', db.selectModel('person').selectRow((row) => row.get('name') === 'minttie')!);
                expect(row.get('friends')().length).toBe(1);
            }
        );
        db.selectModel('person').selectRow(
            (row) => row.get('name') === 'millei',
            (row) => {
                row.deleteRefs('friends', (ref) => ref.get('name') === 'minttie');
                expect(row.get('friends')().length).toBe(1);
            }
        );
    });

    it('remove relation depends on existing row', () => {
        db.selectModel('phone').delete((row) => row.get('model') === 'motolola');
        db.selectModel('person').selectRow(
            (row) => row.get('name') === 'millei',
            (row) => {
                const phone = row.get('phone')();
                expect(phone).toBe(null);
            }
        );
    });

    it('also remove relation depends on dependent rows', () => {
        db.selectModel('person').delete((row) => row.get('name') === 'minttie');
        db.selectModel('person').selectRow(
            (row) => row.get('name') === 'dookie',
            (row) => expect(row.get('friends')().length).toBe(0)
        );
    });
});
