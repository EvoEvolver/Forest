import { Request, Response } from 'express';
import { getIssueModel } from '../models/Issue';
import mongoose from 'mongoose';
import { emailQueue } from '../services/emailQueue';

// Email queue is initialized as singleton in emailQueue.ts

// Helper function to get user email
async function getUserEmail(userId: string): Promise<{ email: string | null, username: string }> {
  try {
    const response = await fetch(`${process.env.USER_SERVICE_URL || 'http://localhost:29999'}/api/user/metadata/${userId}`);
    
    if (response.ok) {
      const userData = await response.json();
      return {
        email: userData.email || null,
        username: userData.username || userData.display_name || userData.name || userData.user_name || userId
      };
    }
    
    return { email: null, username: userId };
  } catch (error) {
    console.error(`Failed to fetch user data for ${userId}:`, error);
    return { email: null, username: userId };
  }
}

// Helper function to queue assignment notifications to assignees
async function queueAssignmentNotifications(assigneeIds: string[], issue: any, context: 'create' | 'update' = 'create') {
  if (!assigneeIds || assigneeIds.length === 0) {
    return;
  }

  console.log(`Queueing ${context} assignment notifications for ${assigneeIds.length} assignees for issue: ${issue.title}`);
  
  for (const userId of assigneeIds) {
    try {
      const { email, username } = await getUserEmail(userId);
      if (email) {
        await emailQueue.queueAssignmentNotification(email, username, issue, context);
        console.log(`Queued ${context} assignment notification for ${email} for issue: ${issue.title}`);
      } else {
        console.warn(`No email found for assigned user ${userId}`);
      }
    } catch (error) {
      console.error(`Failed to queue ${context} assignment email for user ${userId}:`, error);
    }
  }
}

// Get all issues for a specific tree
export const getIssuesByTree = async (req: Request, res: Response) => {
  try {
    const Issue = await getIssueModel();
    const { treeId } = req.params;
    const { status, priority, nodeId } = req.query;
    
    // Build query filter
    const filter: any = { treeId };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (nodeId) filter['nodes.nodeId'] = nodeId;
    
    const issues = await Issue.find(filter)
      .sort({ createdAt: -1 })
      .exec();
    
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
};

// Get a specific issue by ID
export const getIssueById = async (req: Request, res: Response) => {
  try {
    const Issue = await getIssueModel();
    const { issueId } = req.params;
    const issue = await Issue.findById(issueId);
    
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
    } else {
      res.json(issue);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issue' });
  }
};

// Create a new issue
export const createIssue = async (req: Request, res: Response) => {
  try {
    const Issue = await getIssueModel();
    const { treeId, title, description, priority, dueDate, creator, assignees, nodes, tags } = req.body;
    
    console.log('Creating issue with data:', { treeId, title, description, priority, dueDate, creator, assignees, nodes, tags });
    
    // Create new issue
    const newIssue = new Issue({
      treeId,
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate || undefined,
      creator,
      assignees: assignees || [],
      nodes: nodes || [],
      tags: tags || [],
      comments: []
    });
    
    const savedIssue = await newIssue.save();
    
    // Queue assignment notifications for all assignees (since this is a new issue)
    if (assignees && assignees.length > 0) {
      const assigneeIds = assignees.map((a: any) => a.userId);
      await queueAssignmentNotifications(assigneeIds, savedIssue.toObject(), 'create');
    }
    
    res.status(201).json(savedIssue);
  } catch (error: any) {
    console.error('Error creating issue:', error);
    res.status(500).json({ error: 'Failed to create issue', details: error.message });
  }
};

// Update an existing issue
export const updateIssue = async (req: Request, res: Response) => {
  try {
    const Issue = await getIssueModel();
    const { issueId } = req.params;
    const updates = req.body;
    
    // Get the original issue to compare assignees
    const originalIssue = await Issue.findById(issueId);
    if (!originalIssue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    
    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.treeId;
    delete updates.createdAt;
    
    const updatedIssue = await Issue.findByIdAndUpdate(
      issueId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!updatedIssue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    console.log('updates.assignees', updates.assignees);
    // Check for new assignees and send notification emails
    if (updates.assignees) {
      console.log('try to send assignment notifications');
      const originalAssigneeIds = originalIssue.assignees.map(a => a.userId);
      const newAssigneeIds = updates.assignees
        .map((a: any) => a.userId)
        .filter((id: string) => !originalAssigneeIds.includes(id));
      
      // Queue emails to new assignees only
      await queueAssignmentNotifications(newAssigneeIds, updatedIssue.toObject(), 'update');
    }
    
    res.json(updatedIssue);
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
};

// Delete an issue
export const deleteIssue = async (req: Request, res: Response) => {
  try {
    const Issue = await getIssueModel();
    const { issueId } = req.params;
    const deletedIssue = await Issue.findByIdAndDelete(issueId);
    
    if (!deletedIssue) {
      res.status(404).json({ error: 'Issue not found' });
    } else {
      res.json({ message: 'Issue deleted successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete issue' });
  }
};

// Add comment to an issue
export const addComment = async (req: Request, res: Response) => {
  try {
    const Issue = await getIssueModel();
    const { issueId } = req.params;
    const { userId, content } = req.body;
    
    const comment = {
      commentId: new mongoose.Types.ObjectId().toString(),
      userId,
      content,
      createdAt: new Date()
    };
    
    const updatedIssue = await Issue.findByIdAndUpdate(
      issueId,
      { 
        $push: { comments: comment },
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedIssue) {
      res.status(404).json({ error: 'Issue not found' });
    } else {
      res.json(updatedIssue);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Resolve an issue
export const resolveIssue = async (req: Request, res: Response) => {
  try {
    const Issue = await getIssueModel();
    const { issueId } = req.params;
    const { resolvedBy } = req.body;
    
    const updatedIssue = await Issue.findByIdAndUpdate(
      issueId,
      { 
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedIssue) {
      res.status(404).json({ error: 'Issue not found' });
    } else {
      res.json(updatedIssue);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve issue' });
  }
}; 