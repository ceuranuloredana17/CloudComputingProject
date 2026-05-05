// lib/mongodb.js

import { MongoClient, } from 'mongodb';

const uri = process.env.NEXT_ATLAS_URI;

let mongoClient = null;
let database = null;

if (!process.env.NEXT_ATLAS_URI) {
    throw new Error('Please add your Mongo URI to .env');
}

export async function connectToDatabase() {
    try {
        if (mongoClient && database) {
            return { mongoClient, database, };
        }
        if (process.env.NODE_ENV === 'development') {
            if (!global._mongoClient) {
                mongoClient = await (new MongoClient(uri)).connect();
                global._mongoClient = mongoClient;
            } else {
                mongoClient = global._mongoClient;
            }
        } else {
            mongoClient = await (new MongoClient(uri)).connect();
        }
        database = await mongoClient.db(process.env.NEXT_ATLAS_DATABASE);
        return { mongoClient, database, };
    } catch (e) {
        console.error(e);
    }
}

export async function getCollection(name) {
    const { database } = await connectToDatabase();
    return database.collection(name);
}
