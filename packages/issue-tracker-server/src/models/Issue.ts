import mongoose, { Schema, Document, Connection, Model } from 'mongoose';
import { Issue as IssueInterface } from '../types/Issue';

// Extend the interface to include mongoose Document properties
export interface IssueDocument extends Omit<IssueInterface, '_id'>, Document {}

// Create a separate connection
let connection: Connection | null = null;
let IssueModel: Model<IssueDocument> | null = null;

// MongoDB connection
const connectDB = async (): Promise<Connection> => {
  if (connection) {
    return connection;
  }

  try {
    const mongoUri = process.env.Y_PERSISTENCE_MONGO_URL+"/issues" || 'mongodb://localhost:27017/issues';
    connection = await mongoose.createConnection(mongoUri);
    console.log('Connected to MongoDB for issues', mongoUri);
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Define the schema
const IssueSchema = new Schema<IssueDocument>({
  treeId: { 
    type: String, 
    required: true,
    index: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  creator: {
    userId: { type: String, required: true },
    username: { type: String }
  },
  assignees: [{
    userId: { type: String },
    username: { type: String },
    assignedAt: { type: Date, default: Date.now }
  }],
  nodes: [{
    nodeId: { type: String, required: true }
  }],
  tags: [{ type: String }],
  comments: [{
    commentId: { type: String, required: true },
    userId: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  resolvedAt: { type: Date },
  resolvedBy: { type: String }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Create indexes for better query performance
IssueSchema.index({ treeId: 1, status: 1 });
IssueSchema.index({ treeId: 1, 'nodes.nodeId': 1 });
IssueSchema.index({ createdAt: -1 });

// Export the model factory function - creates singleton model instance
export const getIssueModel = async (): Promise<Model<IssueDocument>> => {
  if (IssueModel) {
    return IssueModel;
  }

  const dbConnection = await connectDB();
  IssueModel = dbConnection.model<IssueDocument>('Issue', IssueSchema);
  return IssueModel;
};

// Export the connection function for external use
export { connectDB }; 