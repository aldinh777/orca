import { describe, expect, it } from 'bun:test';
import { DataBase } from '../src/db/DataBase';
import { Model } from '../src/db/Model';

interface User {
    name: string;
    address: Address;
    posts: Set<Post>;
    friends: Set<User>;
    likedPosts: Set<Post>;
}

interface Address {
    street: string;
    user: User;
}

interface Post {
    title: string;
    author: User;
    likes: Set<User>;
}

describe('Relational Operations', () => {
    const db = new DataBase();
    const User: Model<User> = db.createModel('user').varchar('name').done();
    const Address: Model<Address> = db.createModel('address').varchar('street').done();
    const Post: Model<Post> = db.createModel('post').varchar('title').done();

    // One to One
    // Address --= User [User-Address]
    const UserAddress = User.hasOne('address', Address);
    Address.hasOne('user', User).through(UserAddress);

    // One to Many
    // User --< Post [Post-Author]
    const Authors = Post.hasOne('author', User);
    User.hasMany('posts', Post).through(Authors);

    // One to Many (recursive)
    // User -=< User [Friends]
    User.hasMany('friends', User);

    // Many to Many
    // User >=< Post [Likes-LikedBy]
    const Likes = Post.hasMany('likes', User);
    User.hasMany('likedPosts', Post).through(Likes);

    describe('relate one to one', () => {
        it('relate through creation', () => {
            const addr = Address.insert({ street: 'addr1' });
            const user = User.insert({ name: 'user1', address: addr });
            expect(user.address).toBe(addr);
            expect(addr.user).toBe(user);
        });

        it('relate opposite through creation', () => {
            const user = User.insert({ name: 'user3' });
            const addr = Address.insert({ street: 'addr3', user: user });
            expect(user.address).toBe(addr);
            expect(addr.user).toBe(user);
        });

        it('relate through assignment', () => {
            const addr = Address.insert({ street: 'addr2' });
            const user = User.insert({ name: 'user2' });
            user.address = addr;
            expect(user.address).toBe(addr);
            expect(addr.user).toBe(user);
        });

        it('relate opposite through assignment', () => {
            const user = User.insert({ name: 'user4' });
            const addr = Address.insert({ street: 'addr4' });
            user.address = addr;
            expect(user.address).toBe(addr);
            expect(addr.user).toBe(user);
        });

        it('replace relation on value change', () => {
            const oldAddr = Address.insert({ street: 'addr5' });
            const newAddr = Address.insert({ street: 'addr6' });
            const oldUser = User.insert({ name: 'user5', address: oldAddr });
            const newUser = User.insert({ name: 'user6', address: newAddr });
            // replace old user's address to new address,
            // which in turn replace new address's user
            oldUser.address = newAddr;
            expect(oldUser.address).toBe(newAddr);
            expect(oldAddr.user).toBeNull();
            expect(newUser.address).toBeNull();
            expect(newAddr.user).toBe(oldUser);
        });
    });

    describe('relate one to many', () => {
        it('relate through creation', () => {
            const posts = Post.insertAll([{ title: 'post1' }, { title: 'post2' }]);
            const author = User.insert({ name: 'author1', posts: new Set(posts) });
            expect(author.posts.size).toBe(2);
            expect(posts[0].author).toBe(author);
            expect(posts[1].author).toBe(author);
        });

        it('relate opposite through assignment', () => {
            const author = User.insert({ name: 'author3' });
            const posts = Post.insertAll([
                { title: 'post3', author: author },
                { title: 'post4', author: author }
            ]);
            expect(author.posts.size).toBe(2);
            expect(posts[0].author).toBe(author);
            expect(posts[1].author).toBe(author);
        });

        it('relate through assignment', () => {
            const author = User.insert({ name: 'author5' });
            const posts = Post.insertAll([{ title: 'post5' }, { title: 'post6' }]);
            posts[0].author = author;
            posts[1].author = author;
            expect(author.posts.size).toBe(2);
            expect(posts[0].author).toBe(author);
            expect(posts[1].author).toBe(author);
        });

        it('relate through insertion', () => {
            const author = User.insert({ name: 'author7' });
            const posts = Post.insertAll([{ title: 'post7' }, { title: 'post8' }]);
            author.posts.add(posts[0]);
            author.posts.add(posts[1]);
            expect(author.posts.size).toBe(2);
            expect(posts[0].author).toBe(author);
            expect(posts[1].author).toBe(author);
        });

        it('replace relation on relatio change', () => {
            const oldAuthor = User.insert({ name: 'author9' });
            const newAuthor = User.insert({ name: 'author10' });
            const oldPost = Post.insert({ title: 'post:9', author: oldAuthor });
            const newPost = Post.insert({ title: 'post:10', author: newAuthor });
            // through assignment
            oldPost.author = newAuthor;
            expect(oldPost.author).toBe(newAuthor);
            expect(newPost.author).toBe(newAuthor);
            expect(oldAuthor.posts.size).toBe(0);
            expect(newAuthor.posts.size).toBe(2);
            // through insertion
            oldAuthor.posts.add(newPost);
            expect(oldPost.author).toBe(newAuthor);
            expect(newPost.author).toBe(oldAuthor);
            expect(oldAuthor.posts.size).toBe(1);
            expect(newAuthor.posts.size).toBe(1);
        });
    });

    describe('relate one to many recursively', () => {});

    describe('relate many to many', () => {});
});
