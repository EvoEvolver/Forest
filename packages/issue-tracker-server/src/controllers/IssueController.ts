import {Request, Response} from 'express';
import {getIssueModel} from '../models/Issue';
import mongoose from 'mongoose';
import {EmailService} from '../services/emailService';

// Email service instance
const emailService = new EmailService();

// Helper function to get user email
async function getUserEmail(userId: string): Promise<{ email: string | null, username: string }> {
    try {
        const response = await fetch(`${process.env.USER_SERVICE_URL || 'http://localhost:29999'}/api/user/metadata/${userId}`);

        if (response.ok) {
            const userData = await response.json();

            // Match frontend priority order: display_name > name > user_name > email prefix > fallback to id
            const username = userData.display_name || userData.name || userData.user_name || userData.email?.split('@')[0] || userId;

            return {
                email: userData.email || null,
                username: username
            };
        }

        return {email: null, username: userId};
    } catch (error) {
        console.error(`Failed to fetch user data for ${userId}:`, error);
        return {email: null, username: userId};
    }
}


async function sendAssignmentNotifications(assigneeIds: string[], issue: any, context: 'create' | 'update' = 'create', excludeUserId?: string) {
    if (!assigneeIds || assigneeIds.length === 0) {
        return;
    }

    // Filter out the user who created/updated the issue to avoid self-notification
    const filteredAssigneeIds = excludeUserId ? assigneeIds.filter(id => id !== excludeUserId) : assigneeIds;

    if (filteredAssigneeIds.length === 0) {
        console.log(`No assignment notifications to send for issue: ${issue.title} (all assignees excluded)`);
        return;
    }

    console.log(`Sending ${context} assignment notifications for ${filteredAssigneeIds.length} assignees for issue: ${issue.title}`);

    for (const userId of filteredAssigneeIds) {
        try {
            const {email, username} = await getUserEmail(userId);
            if (email) {
                await emailService.sendAssignmentNotification(email, username, issue);
                console.log(`Sent ${context} assignment notification to ${email} for issue: ${issue.title}`);
            } else {
                console.warn(`No email found for assigned user ${userId}`);
            }
        } catch (error) {
            console.error(`Failed to send ${context} assignment email to user ${userId}:`, error);
        }
    }
}

// Helper function to send assignment notifications to reviewers
async function sendReviewerNotifications(reviewerIds: string[], issue: any, context: 'create' | 'update' = 'create', excludeUserId?: string) {
    if (!reviewerIds || reviewerIds.length === 0) {
        return;
    }

    // Filter out the user who created/updated the issue to avoid self-notification
    const filteredReviewerIds = excludeUserId ? reviewerIds.filter(id => id !== excludeUserId) : reviewerIds;

    if (filteredReviewerIds.length === 0) {
        console.log(`No reviewer notifications to send for issue: ${issue.title} (all reviewers excluded)`);
        return;
    }

    console.log(`Sending ${context} reviewer notifications for ${filteredReviewerIds.length} reviewers for issue: ${issue.title}`);

    for (const userId of filteredReviewerIds) {
        try {
            const {email, username} = await getUserEmail(userId);
            if (email) {
                await emailService.sendReviewerNotification(email, username, issue);
                console.log(`Sent ${context} reviewer notification to ${email} for issue: ${issue.title}`);
            } else {
                console.warn(`No email found for assigned user ${userId}`);
            }
        } catch (error) {
            console.error(`Failed to send ${context} assignment email to user ${userId}:`, error);
        }
    }
}

// Helper function to send comment notifications to assignees and creator (excluding commenter)
async function sendCommentNotifications(issue: any, comment: any, commenterUserId: string) {
    console.log(`Sending comment notifications for issue: ${issue.title}`);

    // Get commenter info for the email
    const {username: commenterName} = await getUserEmail(commenterUserId);

    // Collect all unique user IDs that should receive notifications
    const recipientUserIds = new Set<string>();

    // Add creator (if not the commenter)
    if (issue.creator && issue.creator.userId && issue.creator.userId !== commenterUserId) {
        recipientUserIds.add(issue.creator.userId);
    }

    // Add all assignees (if not the commenter)
    if (issue.assignees && issue.assignees.length > 0) {
        issue.assignees.forEach((assignee: any) => {
            if (assignee.userId && assignee.userId !== commenterUserId) {
                recipientUserIds.add(assignee.userId);
            }
        });
    }

    // Add all reviewers (if not the commenter)
    if (issue.reviewers && issue.reviewers.length > 0) {
        issue.reviewers.forEach((reviewer: any) => {
            if (reviewer.userId && reviewer.userId !== commenterUserId) {
                recipientUserIds.add(reviewer.userId);
            }
        });
    }

    console.log(`Sending comment notifications to ${recipientUserIds.size} users for issue: ${issue.title}`);

    // Send notifications to all recipients
    for (const userId of recipientUserIds) {
        try {
            const {email, username} = await getUserEmail(userId);
            if (email) {
                await emailService.sendCommentNotification(email, username, issue, comment, commenterName);
                console.log(`Sent comment notification to ${email} for issue: ${issue.title}`);
            } else {
                console.warn(`No email found for user ${userId}`);
            }
        } catch (error) {
            console.error(`Failed to send comment notification for user ${userId}:`, error);
        }
    }
}


// Get all issues for a specific tree
export const getIssuesByTree = async (req: Request, res: Response) => {
    try {
        const Issue = await getIssueModel();
        const {treeId} = req.params;
        const {status, priority, nodeId} = req.query;

        // Build query filter
        const filter: any = {treeId};

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (nodeId) filter['nodes.nodeId'] = nodeId;

        const issues = await Issue.find(filter)
            .sort({createdAt: -1})
            .exec();

        res.json(issues);
    } catch (error) {
        console.error('Error in getIssuesByTree:', error);
        res.status(500).json({error: 'Failed to fetch issues'});
    }
};

// Get a specific issue by ID
export const getIssueById = async (req: Request, res: Response) => {
    try {
        const Issue = await getIssueModel();
        const {issueId} = req.params;
        const issue = await Issue.findById(issueId);

        if (!issue) {
            res.status(404).json({error: 'Issue not found'});
        } else {
            res.json(issue);
        }
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch issue'});
    }
};

// Create a new issue
export const createIssue = async (req: Request, res: Response) => {
    try {
        const Issue = await getIssueModel();
        const {treeId, title, description, priority, dueDate, creator, assignees, reviewers, nodes, tags} = req.body;

        console.log('Creating issue with data:', {
            treeId,
            title,
            description,
            priority,
            dueDate,
            creator,
            assignees,
            reviewers,
            nodes,
            tags
        });

        // Create new issue
        const newIssue = new Issue({
            treeId,
            title,
            description,
            priority: priority || 'medium',
            dueDate: dueDate || undefined,
            creator,
            assignees: assignees || [],
            reviewers: reviewers || [],
            nodes: nodes || [],
            tags: tags || [],
            comments: []
        });

        const savedIssue = await newIssue.save();

        // Send assignment notifications for all assignees (excluding creator to avoid self-notification)
        if (assignees && assignees.length > 0) {
            const assigneeIds = assignees.map((a: any) => a.userId);
            // Use setImmediate to avoid blocking the response
            setImmediate(() => sendAssignmentNotifications(assigneeIds, savedIssue.toObject(), 'create', creator.userId));
        }

        // Send notifications to reviewers if the issue is in review
        if (savedIssue.status === 'in_review' && reviewers && reviewers.length > 0) {
            const reviewerIds = reviewers.map((r: any) => r.userId);
            setImmediate(() => sendReviewerNotifications(reviewerIds, savedIssue.toObject(), 'create', creator.userId));
        }

        res.status(201).json(savedIssue);
    } catch (error: any) {
        console.error('Error creating issue:', error);
        res.status(500).json({error: 'Failed to create issue', details: error.message});
    }
};

// Update an existing issue
export const updateIssue = async (req: Request, res: Response) => {
    try {
        const Issue = await getIssueModel();
        const {issueId} = req.params;
        const updates = req.body;

        // Get the original issue to compare assignees
        const originalIssue = await Issue.findById(issueId);
        if (!originalIssue) {
            res.status(404).json({error: 'Issue not found'});
            return;
        }

        // Remove fields that shouldn't be updated directly
        delete updates._id;
        delete updates.treeId;
        delete updates.createdAt;

        const updatedIssue = await Issue.findByIdAndUpdate(
            issueId,
            {...updates, updatedAt: new Date()},
            {new: true}
        );

        if (!updatedIssue) {
            res.status(404).json({error: 'Issue not found'});
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

            // Send emails to new assignees only (excluding the user who made the update)
            if (newAssigneeIds.length > 0) {
                // Use setImmediate to avoid blocking the response
                setImmediate(() => sendAssignmentNotifications(newAssigneeIds, updatedIssue.toObject(), 'update', updates.updatedBy));
            }
        }

        // Check for new reviewers and send notification emails
        if (updates.reviewers) {
            console.log('try to send reviewer notifications');
            const originalReviewerIds = originalIssue.reviewers.map(r => r.userId);
            const newReviewerIds = updates.reviewers
                .map((r: any) => r.userId)
                .filter((id: string) => !originalReviewerIds.includes(id));

            // Send emails to new reviewers only if the issue is in review
            if (newReviewerIds.length > 0 && updatedIssue.status === 'in_review') {
                // Use setImmediate to avoid blocking the response
                setImmediate(() => sendReviewerNotifications(newReviewerIds, updatedIssue.toObject(), 'update', updates.updatedBy));
            }
        }

        // If status changed to 'in_review', send notifications to all reviewers
        if (updates.status === 'in_review' && originalIssue.status !== 'in_review') {
            const reviewerIds = updatedIssue.reviewers.map((r: any) => r.userId);
            if (reviewerIds.length > 0) {
                setImmediate(() => sendReviewerNotifications(reviewerIds, updatedIssue.toObject(), 'update', updates.updatedBy));
            }
        }

        res.json(updatedIssue);
    } catch (error) {
        console.error('Error updating issue:', error);
        res.status(500).json({error: 'Failed to update issue'});
    }
};

// Delete an issue
export const deleteIssue = async (req: Request, res: Response) => {
    try {
        const Issue = await getIssueModel();
        const {issueId} = req.params;
        const deletedIssue = await Issue.findByIdAndDelete(issueId);

        if (!deletedIssue) {
            res.status(404).json({error: 'Issue not found'});
        } else {
            res.json({message: 'Issue deleted successfully'});
        }
    } catch (error) {
        res.status(500).json({error: 'Failed to delete issue'});
    }
};

// Add comment to an issue
export const addComment = async (req: Request, res: Response) => {
    try {
        const Issue = await getIssueModel();
        const {issueId} = req.params;
        const {userId, content} = req.body;

        const comment = {
            commentId: new mongoose.Types.ObjectId().toString(),
            userId,
            content,
            createdAt: new Date()
        };

        const updatedIssue = await Issue.findByIdAndUpdate(
            issueId,
            {
                $push: {comments: comment},
                updatedAt: new Date()
            },
            {new: true}
        );

        if (!updatedIssue) {
            res.status(404).json({error: 'Issue not found'});
            return;
        }

        // Send comment notifications to all relevant users (excluding the commenter)
        setImmediate(() => sendCommentNotifications(updatedIssue.toObject(), comment, userId));

        res.json(updatedIssue);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({error: 'Failed to add comment'});
    }
};

// Resolve an issue
export const resolveIssue = async (req: Request, res: Response) => {
    try {
        const Issue = await getIssueModel();
        const {issueId} = req.params;
        const {resolvedBy} = req.body;

        const updatedIssue = await Issue.findByIdAndUpdate(
            issueId,
            {
                status: 'resolved',
                resolvedAt: new Date(),
                resolvedBy,
                updatedAt: new Date()
            },
            {new: true}
        );

        if (!updatedIssue) {
            res.status(404).json({error: 'Issue not found'});
        } else {
            res.json(updatedIssue);
        }
    } catch (error) {
        res.status(500).json({error: 'Failed to resolve issue'});
    }
}; 