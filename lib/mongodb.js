// lib/mongodb.js

import { MongoClient, } from 'mongodb';

const uri = process.env.NEXT_ATLAS_URI;

let mongoClient = null;
let database = null;

if (!process.env.NEXT_ATLAS_URI) {
    throw new Error('Please add your Mongo URI to .env');
}

if (!process.env.NEXT_ATLAS_DATABASE) {
    throw new Error('Please add your Mongo database name to .env');
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
        database = mongoClient.db(process.env.NEXT_ATLAS_DATABASE);
        return { mongoClient, database, };
    } catch (e) {
        console.error('MongoDB connection failed:', e);
        throw new Error(
            'Failed to connect to MongoDB. Check NEXT_ATLAS_URI, NEXT_ATLAS_DATABASE, and TLS/network settings.',
            { cause: e }
        );
    }
}

export async function getCollection(name) {
    const connection = await connectToDatabase();
    if (!connection?.database) {
        throw new Error('MongoDB database is not available.');
    }
    const { database } = connection;
    return database.collection(name);
}
