import {MongoClient} from 'mongodb';
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({
    path: path.resolve(__dirname, '.env'),
})
let mongoUrl: string | null = process.env.Y_PERSISTENCE_MONGO_URL || null;

let mongoClient: MongoClient | null = null;

export const getMongoClient = (): MongoClient | null => {
    return mongoClient;
}

export const setMongoConnection = () => {
    if (!mongoUrl) {
        console.warn("MongoDB URL not set.")
        return
    }

    if (mongoClient) {
        console.warn("MongoDB client already initialized.")
        return
    }

    mongoClient = new MongoClient(mongoUrl, {
        // This ignores database name
        directConnection: true
    });

    mongoClient.connect()
        .then(() => {
            console.log("MongoDB connection established.");
        })
        .catch(err => {
            console.error("Failed to connect to MongoDB:", err);
        });

}