import { describe, expect, it } from 'bun:test';
import { DataBase } from '../src/db/DataBase';
import { Model } from '../src/db/Model';

interface Person {
    name: string;
    age: number;
    score: number;
    is_admin: boolean;
    birthday: string | Date;
}

describe('Common Operations', () => {
    const db = new DataBase();

    // Model Creation
    const Person: Model<Person> = db
        .createModel('person')
        .varchar('name')
        .int('age')
        .float('score')
        .bool('is_admin')
        .date('birthday')
        .done();

    // Model Operations
    it('insert one data', () => {
        const row = Person.insert({
            name: 'agustina',
            age: 27,
            score: 2.5,
            is_admin: false,
            birthday: '2001/12/06'
        });
        expect(row.name).toBe('agustina');
        expect(row.age).toBe(27);
        expect(row.score).toBe(2.5);
        expect(row.is_admin).toBeFalse();
        expect(row.birthday).toBeDate();
    });

    it('insert many data', () => {
        const rows = Person.insertAll([
            {
                name: 'boorhan',
                age: 26,
                score: 4.5,
                is_admin: false,
                birthday: '2001/12/11'
            },
            {
                name: 'yosuke',
                age: 15,
                score: 6.6,
                is_admin: false,
                birthday: '1998/06/25'
            }
        ]);
        expect(rows).toBeArrayOfSize(2);
        expect(rows[0].name).toBe('boorhan');
        expect(rows[1].name).toBe('yosuke');
    });

    it('insert default value', () => {
        const row = Person.insert({});
        expect(row.name).toBe('');
        expect(row.age).toBe(0);
        expect(row.score).toBe(0);
        expect(row.is_admin).toBeFalse();
        expect(row.birthday).toBeDate();
    });

    it('insert mismatched value', () => {
        const row = Person.insert({
            // @ts-ignore
            name: 27765,
            // @ts-ignore
            age: '66666',
            // @ts-ignore
            score: {},
            // @ts-ignore
            is_admin: 0,
            // @ts-ignore
            birthday: 17111998
        });
        expect(row.name).toBe('27765');
        expect(row.age).toBe(66666);
        expect(row.score).toBe(0);
        expect(row.is_admin).toBeFalse();
        expect(row.birthday).toBeDate();
    });

    it('update value', () => {
        const row = Person.insert({});
        // @ts-ignore
        row.name = 266572;
        expect(row.name).toBe('266572');
    });

    it('select and delete items', () => {
        Person.insertAll([
            {
                name: 'agustinus',
                is_admin: true
            },
            {
                name: 'cecilion',
                // @ts-ignore
                is_admin: 1
            },
            {
                name: 'badaruddin',
                // @ts-ignore
                is_admin: 'yes'
            }
        ]);
        // select
        let rows = Person.where((row) => row.is_admin);
        expect(rows).toBeArrayOfSize(3);

        // delete
        Person.where(
            (row) => row.is_admin,
            (row) => Person.delete(row)
        );
        rows = Person.where((row) => row.is_admin);
        expect(rows).toBeArrayOfSize(0);
    });

    it('operates from db instead of model', () => {
        db.from<Person>('person')!.insertAll([
            {
                name: 'agustinus',
                is_admin: true
            },
            {
                name: 'cecilion',
                // @ts-ignore
                is_admin: 1
            },
            {
                name: 'badaruddin',
                // @ts-ignore
                is_admin: 'yes'
            }
        ]);
        const rows = db.from<Person>('person')!.where((row) => row.is_admin);
        expect(rows).toBeArrayOfSize(3);
    });
});
