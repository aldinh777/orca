import { describe, expect, it } from 'bun:test';
import OrcaDB from '../src/db/OrcaDB';
import Model from '../src/db/Model';

describe('Common Operations', () => {
    const db = new OrcaDB();

    describe('Model Operations', () => {
        let userModel: Model;

        it('model creation', () => {
            userModel = db.createModel('user', {
                name: 'string',
                age: 'number',
                isekaied: 'boolean'
            });
        });

        it('select model from db', () => {
            const selectedmodel = db.selectModel('user');
            expect(userModel).toBe(selectedmodel);
        });

        it('insert into model', () => {
            const users = db.selectModel('user').insertAll([
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
            ]);
            expect(users.length).toBe(4);
        });

        it('select from rows', () => {
            const users = db.selectModel('user').selectRows('*');
            const adultUsers = db.selectModel('user').selectRows((row) => row.get('age') > 20);
            expect(users.length).toBe(4);
            expect(adultUsers.length).toBe(2);
        });

        it('update selected rows', () => {
            const user = db.selectModel('user').selectRow(
                (row) => row.get('name') === 'aldi',
                (row) => row.set('age', row.get('age') + 1)
            );
            expect(user).not.toBeUndefined();
            expect(user!.get('age')).toBe(26);
        });

        it('delete selected rows', () => {
            db.selectModel('user').delete('*');
            const users = db.selectModel('user').selectRows('*');
            expect(users.length).toBe(0);
        });
    });
});
