import axios from 'axios';
import type {AddCommentRequest, CreateIssueRequest, Issue, UpdateIssueRequest} from '../types/Issue';
import {atom} from "jotai";
import {userAtom} from "@forest/user-system/src/authStates";

// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:29999';

const apiAtom = atom((get)=>{
    const authToken = get(userAtom)?.token;
    console.log(authToken)
    return axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
        "Authorization": authToken ? `Bearer ${authToken}` : ""
    },
    withCredentials: true
});})

export const issueServiceAtom = atom((get) => {
    const api = get(apiAtom)
    return {
        // Get all issues for a specific tree
        async getIssuesByTree(treeId: string, params?: {
            status?: string;
            priority?: string;
            nodeId?: string;
        }): Promise<Issue[]> {

            console.log(params)
            const response = await api.get(`/issues/tree/${treeId}`, {params});
            return response.data;
        },

        // Get a specific issue by ID
        async getIssueById(issueId: string): Promise<Issue> {
            const response = await api.get(`/issues/${issueId}`);
            return response.data;
        },

        // Create a new issue
        async createIssue(treeId: string, issue: CreateIssueRequest): Promise<Issue> {
            const issueData = {
                ...issue,
                treeId,
                creator: {
                    userId: get(userAtom).id
                }
            };
            const response = await api.post('/issues', issueData);
            return response.data;
        },

        // Update an existing issue
        async updateIssue(issueId: string, updates: UpdateIssueRequest): Promise<Issue> {
            const response = await api.put(`/issues/${issueId}`, updates);
            return response.data;
        },

        // Delete an issue
        async deleteIssue(issueId: string): Promise<void> {
            await api.delete(`/issues/${issueId}`);
        },

        // Add comment to an issue
        async addComment(issueId: string, comment: AddCommentRequest): Promise<Issue> {
            const response = await api.post(`/issues/${issueId}/comments`, comment);
            return response.data;
        },

        // Resolve an issue
        async resolveIssue(issueId: string, resolvedBy: string): Promise<Issue> {
            const response = await api.patch(`/issues/${issueId}/resolve`, {resolvedBy});
            return response.data;
        },
    }
})

export default issueServiceAtom;