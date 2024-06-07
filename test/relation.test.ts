import { describe, expect, it } from 'bun:test';
import { DataBase } from '../src/db/DataBase';

describe('Relational Operations', () => {
    const db = new DataBase();
    const User = db.createModel('user').varchar('name').done();
    const Post = db.createModel('post').varchar('title').text('content').done();

    // Model Relation
    const Authors = Post.hasOneToOne('author', User);
    User.hasOneToMany('posts', Post, Authors);

    User.hasManyToMany('friends', User);

    const Likes = Post.hasManyToMany('likes', User);
    User.hasManyToMany('likedPosts', Post, Likes);

    it('has one to one relationship', () => {
        // null author
        const post1 = Post.insert({
            title: 't1',
            content: 'asdfghjkl'
        });
        expect(post1.author).toBeNull();

        // new author
        const post2 = Post.insert({
            title: 't2',
            content: 'asdasdad',
            author: { name: 'angle' }
        });
        const author = User.find((row) => row.name === 'angle');
        expect(post2.author).toBe(author);

        // existing author
        const post3 = Post.insert({
            title: 't3',
            content: 'j12hi12h3ui1h2i3u',
            author: author
        });
        expect(post3.author).toBe(author);

        // setting author
        post1.author = author;
        expect(post1.author).toBe(author);
    });

    // it('has one to many relationship', () => {
    //     const author = User.insert({ name: 'sutrisno' });
    // });
});
