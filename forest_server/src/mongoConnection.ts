import { MongoClient } from 'mongodb';

let mongoUrl = process.env.Y_PERSISTENCE_MONGO_URL || null

let mongoClient = null

export const getMongoClient = () => {
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