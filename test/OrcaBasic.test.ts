import { describe, expect, it } from "bun:test";
import OrcaCache from '../src/db/OrcaCache';
import OrcaModel from "../src/db/OrcaModel";

describe('Reactive Database', () => {
    const db = new OrcaCache();
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
    describe('Model Operations', () => {
        let userModel: OrcaModel;
        it('model creation', () => {
            userModel = db.createModel('user', sampleStructure);
        });
        it('model selection', () => {
            const selectedmodel = db.selectModel('user');
            expect(userModel).toBe(selectedmodel);
        });
        it('model rows insertion', () => {
            const users = db.selectModel('user').insertAll(sampleData);
            expect(users.length).toBe(4);
        });
        it('model rows selection', () => {
            const users = db.selectModel('user').selectRows('*');
            const adultUsers = db.selectModel('user').selectRows((row) => row.get('age') > 20);
            expect(users.length).toBe(4);
            expect(adultUsers.length).toBe(2);
        });
        it('model rows update', () => {
            const user = db.selectModel('user').selectRow(
                (row) => row.get('name') === 'aldi',
                (row) => row.set('age', row.get('age') + 1)
            );
            expect(user).not.toBeUndefined();
            expect(user!.get('age')).toBe(26);
        });
        it('model rows deletion', () => {
            db.selectModel('user').delete('*');
            const users = db.selectModel('user').selectRows('*');
            expect(users.length).toBe(0);
        });
        it('model deletion', () => {
            db.dropModel('user');
        });
    });
});
