export interface Issue {
    _id: string;                     // MongoDB auto-generated ID
    treeId: string;                  // Associated tree ID
    title: string;                   // Issue title
    description: string;             // Detailed description
    status: 'open' | 'in_progress' | 'in_review' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'urgent';  // Priority level
    dueDate?: Date;                  // Due date for the issue
    createdAt: Date;                 // Creation timestamp
    updatedAt: Date;                 // Last update timestamp
    creator: {
        userId: string;
        username?: string;             // Optional: cached username
    };
    assignees: Array<{
        userId: string;
        username?: string;             // Optional: cached username
        assignedAt: Date;              // Assignment timestamp
    }>;
    reviewers?: Array<{
        userId: string;
        username?: string;             // Optional: cached username
        assignedAt: Date;              // Assignment timestamp
    }>;
    nodes: Array<{
        nodeId: string;
    }>;
    tags: string[];                  // Tags array
    comments?: Array<{               // Comment system
        commentId: string;
        userId: string;
        content: string;
        createdAt: Date;
    }>;
    resolvedAt?: Date;               // Resolution timestamp
    resolvedBy?: string;             // Resolver's ID
} 