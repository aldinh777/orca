import { describe, expect, it } from 'bun:test';
import { DataBase } from '../src/db/DataBase';
import { Model } from '../src/db/Model';

interface User {
    name: string;
    address: Address;
    posts: Post[];
    friends: User[];
    likedPosts: Post[];
}

interface Address {
    street: string;
    user: User;
}

interface Post {
    title: string;
    author: User;
    likes: User[];
}

describe('Relational Operations', () => {
    const db = new DataBase();
    const User: Model<User> = db.createModel('user').varchar('name').done();
    const Address: Model<Address> = db.createModel('address').varchar('street').done();
    const Post: Model<Post> = db.createModel('post').varchar('title').done();

    // One to One
    // Address --= User [User-Address]
    const UserAddress = User.hasOne('address', Address);
    Address.hasOne('user', User, UserAddress);

    // One to Many
    // User --< Post [Post-Author]
    const Authors = Post.hasOne('author', User);
    User.hasMany('posts', Post, Authors);

    // One to Many (recursive)
    // User -=< User [Friends]
    User.hasMany('friends', User);

    // Many to Many
    // User >=< Post [Likes-LikedBy]
    const Likes = Post.hasMany('likes', User);
    User.hasMany('likedPosts', Post, Likes);
});
