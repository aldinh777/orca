import { describe, expect, it } from 'bun:test';
import OrcaCache from '../src/db/Cache';

describe('Reactive DB Relations', () => {
    const db = new OrcaCache();
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
    db.createModel('person', {
        name: 'string',
        phone: 'ref:phone',
        oshis: 'refs:person'
    });
    db.createModel('phone', {
        model: 'string'
    });
    db.selectModel('person').insertAll(sampleData);
    describe('Manual Labor', () => {
        it('has valid oshis and phones', () => {
            db.selectModel('person').selectRow(
                (row) => row.get('name') === 'ookie',
                (row) => {
                    const phone = row.get('phone')();
                    expect(phone.get('model')).toBe('nookiea');
                    expect(row.get('oshis')().length).toBe(0);
                }
            );
            db.selectModel('person').selectRow(
                (row) => row.get('name') === 'millei',
                (row) => {
                    const phone = row.get('phone')();
                    expect(phone).toBe(null);
                    expect(row.get('oshis')().length).toBe(2);
                }
            );
        });
        it('replace phone', () => {
            db.selectModel('person').selectRow(
                (row) => row.get('name') === 'ookie',
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
        it('add or delete oshis', () => {
            db.selectModel('person').selectRow(
                (row) => row.get('name') === 'ookie',
                (row) => {
                    row.addRefs('oshis', db.selectModel('person').selectRow((row) => row.get('name') === 'ennaur')!);
                    expect(row.get('oshis')().length).toBe(1);
                }
            );
            db.selectModel('person').selectRow(
                (row) => row.get('name') === 'millei',
                (row) => {
                    row.deleteRefs('oshis', (ref) => ref.get('name') === 'ennaur');
                    expect(row.get('oshis')().length).toBe(1);
                }
            );
        });
        it('remove person`s phone depend on existing row', () => {
            db.selectModel('phone').delete((row) => row.get('model') === 'motolola');
            db.selectModel('person').selectRow(
                (row) => row.get('name') === 'millei',
                (row) => {
                    const phone = row.get('phone')();
                    expect(phone).toBe(null);
                }
            );
        });
        it('also remove oshis depend on rows', () => {
            db.selectModel('person').delete((row) => row.get('name') === 'ennaur');
            db.selectModel('person').selectRow(
                (row) => row.get('name') === 'ookie',
                (row) => expect(row.get('oshis')().length).toBe(0)
            );
        });
    });
});
