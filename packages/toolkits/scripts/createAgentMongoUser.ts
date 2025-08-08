import { MongoClient } from 'mongodb';
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({
    path: path.resolve(__dirname, '../../server/src/.env'),
});

const MONGO_URL = process.env.Y_PERSISTENCE_MONGO_URL || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'test_db';

// Agent user configuration
const AGENT_USER = {
    username: 'agent_user',
    password: 'secure_agent_password_' + Date.now(), // Generate unique password
    database: DATABASE_NAME
};

async function createAgentMongoUser() {
    const client = new MongoClient(MONGO_URL);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db(DATABASE_NAME);
        
        // Step 1: Create custom role with CRUD permissions but no listCollections
        console.log('Creating custom role: crudOnlyNoList...');
        
        try {
            await db.command({
                createRole: 'crudOnlyNoList',
                privileges: [
                    {
                        resource: { db: DATABASE_NAME, collection: '' }, // Empty string means all collections
                        actions: [
                            'find',        // Read documents
                            'insert',      // Create documents
                            'update',      // Update documents
                            'remove',      // Delete documents
                            'createIndex', // Create indexes (useful for performance)
                            'dropIndex'    // Drop indexes
                        ]
                    }
                ],
                roles: [] // No inherited roles
            });
            console.log('✅ Custom role "crudOnlyNoList" created successfully');
        } catch (error: any) {
            if (error.codeName === 'DuplicateKey') {
                console.log('⚠️  Role "crudOnlyNoList" already exists, skipping creation');
            } else {
                throw error;
            }
        }
        
        // Step 2: Create user with the custom role
        console.log(`Creating user: ${AGENT_USER.username}...`);
        
        try {
            await db.command({
                createUser: AGENT_USER.username,
                pwd: AGENT_USER.password,
                roles: [
                    { role: 'crudOnlyNoList', db: DATABASE_NAME }
                ]
            });
            console.log('✅ Agent user created successfully');
        } catch (error: any) {
            if (error.codeName === 'DuplicateKey') {
                console.log('⚠️  User already exists, updating password and roles...');
                await db.command({
                    updateUser: AGENT_USER.username,
                    pwd: AGENT_USER.password,
                    roles: [
                        { role: 'crudOnlyNoList', db: DATABASE_NAME }
                    ]
                });
                console.log('✅ Agent user updated successfully');
            } else {
                throw error;
            }
        }
        
        // Step 3: Display connection information
        console.log('\n🎉 Agent MongoDB user setup complete!');
        console.log('📋 Connection Details:');
        console.log(`   Username: ${AGENT_USER.username}`);
        console.log(`   Password: ${AGENT_USER.password}`);
        console.log(`   Database: ${DATABASE_NAME}`);
        console.log(`   Connection URL: mongodb://${AGENT_USER.username}:${AGENT_USER.password}@localhost:27017/${DATABASE_NAME}`);
        
        console.log('\n🔒 Security Features:');
        console.log('   ✅ Can perform CRUD operations on any collection (if collection name is known)');
        console.log('   ✅ Can create and drop indexes');
        console.log('   ❌ Cannot list collections (show collections will fail)');
        console.log('   ❌ Cannot list databases');
        console.log('   ❌ Cannot perform admin operations');
        
        // Step 4: Test the permissions
        console.log('\n🧪 Testing permissions...');
        await testAgentPermissions();
        
    } catch (error) {
        console.error('❌ Error creating agent user:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

async function testAgentPermissions() {
    // Connect as the new agent user
    const agentUrl = `mongodb://${AGENT_USER.username}:${AGENT_USER.password}@localhost:27017/${DATABASE_NAME}`;
    const agentClient = new MongoClient(agentUrl);
    
    try {
        await agentClient.connect();
        const agentDb = agentClient.db(DATABASE_NAME);
        
        // Test 1: Try to list collections (should fail)
        console.log('   Testing listCollections (should fail)...');
        try {
            await agentDb.listCollections().toArray();
            console.log('   ❌ SECURITY ISSUE: User can list collections!');
        } catch (error: any) {
            if (error.codeName === 'Unauthorized') {
                console.log('   ✅ Cannot list collections (correct)');
            } else {
                console.log('   ⚠️  Unexpected error:', error.message);
            }
        }
        
        // Test 2: Try CRUD on a known collection (should work)
        console.log('   Testing CRUD operations on test_collection...');
        try {
            const testCollection = agentDb.collection('test_collection');
            
            // Insert test
            const insertResult = await testCollection.insertOne({ 
                test: true, 
                created: new Date(),
                message: 'Agent user test document' 
            });
            console.log('   ✅ Can insert documents');
            
            // Find test
            const document = await testCollection.findOne({ _id: insertResult.insertedId });
            console.log('   ✅ Can read documents');
            
            // Update test
            await testCollection.updateOne(
                { _id: insertResult.insertedId }, 
                { $set: { updated: new Date() } }
            );
            console.log('   ✅ Can update documents');
            
            // Delete test
            await testCollection.deleteOne({ _id: insertResult.insertedId });
            console.log('   ✅ Can delete documents');
            
        } catch (error) {
            console.log('   ❌ CRUD operations failed:', error);
        }
        
    } catch (error) {
        console.log('   ❌ Could not connect as agent user:', error);
    } finally {
        await agentClient.close();
    }
}

// Run the script
if (require.main === module) {
    createAgentMongoUser().catch(console.error);
}

export { createAgentMongoUser, AGENT_USER };