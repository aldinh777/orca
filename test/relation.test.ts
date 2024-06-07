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

    it('has one to many relationship', () => {
        // zero post
        const author1 = User.insert({ name: 'sutrisno' });
        expect(author1.posts()).toBeArrayOfSize(0);

        // new post
        const author2 = User.insert({
            name: 'asparag',
            posts: [
                {
                    title: 'ss1',
                    content: 'daddy issue'
                }
            ]
        });
        expect(author2.posts()).toBeArrayOfSize(1);
        expect(author2.posts(0).title).toBe('ss1');
        expect(author2.posts(0).author).toBe(author2);

        // existing post
        const post1 = Post.insert({ title: 'aloha', content: 'alohomora' });
        const author3 = User.insert({ name: 'roy', posts: [post1] });
        expect(author3.posts()).toBeArrayOfSize(1);
        expect(author3.posts(0).title).toBe('aloha');
        expect(post1.author).toBe(author3);

        // through one to one relation
        const author4 = User.insert({ nama: 'celeste' });
        const post2 = Post.insert({ title: 'pon', content: 'kotsu', author: author4 });
        expect(author4.posts()).toBeArrayOfSize(1);
        expect(author4.posts(0).title).toBe('pon');
        expect(post2.author).toBe(author4);

        // add post
        author1.posts.push(post1);
        expect(author1.posts()).toBeArrayOfSize(1); // before = 0
        expect(author1.posts(0).title).toBe('aloha');
        expect(post1.author).toBe(author1);
        expect(author3.posts()).toBeArrayOfSize(0); // previous owner, before = 1

        // delete post
        author1.posts.pop();
        expect(author1.posts()).toBeArrayOfSize(0); // before = 1
        expect(post1.author).toBeNull(); // deleted

        // swap author
        post2.author = author1;
        expect(author1.posts()).toBeArrayOfSize(1); // before = 0
        expect(author4.posts()).toBeArrayOfSize(0); // previous owner, before = 1
    });
});
