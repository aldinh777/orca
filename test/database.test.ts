import { describe, expect, it } from 'bun:test';
import DataBase from '../src/db/DataBase';

describe('Common Operations', () => {
    const db = new DataBase();

    // Model Creation
    const Person = db
        .createModel('person')
        .varchar('name', { required: true })
        .int('age')
        .float('score')
        .bool('is_admin')
        .date('birthday')
        .done();
    const Post = db
        .createModel('post', { id_type: 'uuid' })
        .varchar('slug', { required: true })
        .varchar('title')
        .text('content')
        .done();

    // Model Relation
    const Authors = Post.hasOne('author', Person);
    Person.hasMany('posts', Post, Authors);

    Person.hasRelation('friends', Person);

    const Likes = Post.hasRelation('likes', Person);
    Person.hasRelation('likedPosts', Post, Likes);

    // Model Operations
    const p1 = Person.insert({
        name: 'agustina',
        age: 27,
        score: 2.5,
        is_admin: false,
        birthday: '2001/12/06'
    });
    expect(p1.name).toBe('agustina');

    const ps1 = Person.insertAll([
        {
            name: 'boorhan',
            age: 26,
            score: 4.5,
            is_admin: false,
            birthday: '2001/12/11'
        },
        {
            name: 'yosuke'
            // ...optionals
        }
    ]);

    it('inititate data', () => {
        expect(ps1).toBeArrayOfSize(2);
        expect(ps1[0].name).toBe('boorhan');
        expect(ps1[1].name).toBe('yosuke');
    });
});
