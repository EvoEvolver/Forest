import { Request, Response } from 'express';
import { getIssueModel } from '../models/Issue';
import { v4 as uuidv4 } from 'uuid';

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
    const issue = await Issue.findOne({ issueId });
    
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
    
    // Generate issue ID using UUID
    // TODO: use the mongodb object id
    const issueId = uuidv4();
    
    const newIssue = new Issue({
      issueId,
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
    
    // Remove fields that shouldn't be updated directly
    delete updates.issueId;
    delete updates.treeId;
    delete updates.createdAt;
    
    const updatedIssue = await Issue.findOneAndUpdate(
      { issueId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!updatedIssue) {
      res.status(404).json({ error: 'Issue not found' });
    } else {
      res.json(updatedIssue);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update issue' });
  }
};

// Delete an issue
export const deleteIssue = async (req: Request, res: Response) => {
  try {
    const Issue = await getIssueModel();
    const { issueId } = req.params;
    const deletedIssue = await Issue.findOneAndDelete({ issueId });
    
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
      commentId: uuidv4(),
      userId,
      content,
      createdAt: new Date()
    };
    
    const updatedIssue = await Issue.findOneAndUpdate(
      { issueId },
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
    
    const updatedIssue = await Issue.findOneAndUpdate(
      { issueId },
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