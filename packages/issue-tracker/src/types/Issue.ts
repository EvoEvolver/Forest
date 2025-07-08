export interface User {
    userId: string;
    username?: string;
}

export interface Node {
    nodeId: string;
    nodeType?: string;
}

export interface Comment {
    commentId: string;
    userId: string;
    content: string;
    createdAt: string;
}

export interface Issue {
    _id: string;
    issueId: string;
    treeId: string;
    title: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
    creator: User;
    assignees?: User[];
    nodes?: Node[];
    tags?: string[];
    comments?: Comment[];
    resolvedAt?: string;
    resolvedBy?: User;
}

export interface AssigneeRequest {
    userId: string;
    username?: string;
}

export interface CreateIssueRequest {
    title: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    tags?: string[];
    assignees?: AssigneeRequest[];
    nodes?: { nodeId: string; nodeType?: string }[];
}

export interface UpdateIssueRequest {
    title?: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    tags?: string[];
    assignees?: AssigneeRequest[];
    nodes?: { nodeId: string; nodeType?: string }[];
}

export interface AddCommentRequest {
    userId: string;
    content: string;
}

export interface ResolveIssueRequest {
    userId: string;
} 