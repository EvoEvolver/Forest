import express from 'express';
import {
  getIssuesByTree,
  getIssueById,
  createIssue,
  updateIssue,
  deleteIssue,
  addComment,
  resolveIssue
} from '../controllers/IssueController';

const router = express.Router();

// Get all issues for a specific tree (must come before /:issueId)
router.get('/tree/:treeId', getIssuesByTree);

// Add comment to an issue (must come before /:issueId)
router.post('/:issueId/comments', addComment);

// Resolve an issue (must come before /:issueId)
router.patch('/:issueId/resolve', resolveIssue);

// Create a new issue
router.post('/', createIssue);

// Get a specific issue by ID (must come after specific paths)
router.get('/:issueId', getIssueById);

// Update an existing issue
router.put('/:issueId', updateIssue);

// Delete an issue
router.delete('/:issueId', deleteIssue);

export default router; 