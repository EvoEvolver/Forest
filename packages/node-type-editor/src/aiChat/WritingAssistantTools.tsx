import React from "react";
import {NodeM, TreeM} from "@forest/schema";
import {z} from "zod";
import {BaseMessage, InfoMessage} from "@forest/agent-chat/src/MessageTypes";
import {EditorNodeTypeM} from "..";
import {TitleMessage, NewNodeMessage, SearchResultMessage} from "./WritingMessage";
import {sanitizeHtmlForEditor} from "./helper";
import {SearchResult, SearchService} from "@forest/client/src/services/searchService";

export const createLoadNodeContentTool = (treeM: TreeM, setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>) => {
    return {
        description: 'Get the current content of a specific node to examine it',
        inputSchema: z.object({
            nodeId: z.string().describe('The ID of the node to show content for')
        }),
        execute: async ({nodeId}: { nodeId: string }) => {

            const nodeToRead: NodeM = treeM.getNode(nodeId);
            if (!nodeToRead || nodeToRead.nodeTypeName() !== "EditorNodeType") {
                throw new Error(`Node ${nodeId} not found or is not an editor node`);
            }

            const content = EditorNodeTypeM.getEditorContent(nodeToRead);
            const title = nodeToRead.title() || "Untitled";

            const writingMsg = new InfoMessage("Loading " + title);

            const num_children = treeM.getChildren(nodeToRead).length;

            setMessages(prevMessages => [...prevMessages, writingMsg]);

            return {
                nodeId,
                title,
                content,
                num_children,
                success: true
            };
        },
    } as const;
};

export const createSuggestNewTitleTool = (treeM: any, setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>) => {
    return {
        description: 'Suggest a new title for a specific node',
        inputSchema: z.object({
            nodeId: z.string().describe('The ID of the node to suggest a new title for'),
            newTitle: z.string().describe('The new title for the node')
        }),
        execute: async ({nodeId, newTitle}: { nodeId: string; newTitle: string }) => {

            const nodeToUpdate: NodeM = treeM.getNode(nodeId);
            if (!nodeToUpdate || nodeToUpdate.nodeTypeName() !== "EditorNodeType") {
                throw new Error(`Node ${nodeId} not found or is not an editor node`);
            }

            const titleMsg = new TitleMessage({
                content: `Suggesting new title: "${newTitle}"`,
                role: "assistant",
                author: "Writing Assistant",
                nodeId: nodeId,
                newTitle: newTitle,
                treeM: treeM
            });

            setMessages(prevMessages => [...prevMessages, titleMsg]);

            return {success: true};
        },
    } as const;
};

export const createSuggestNewNodeTool = (treeM: any, setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>) => {
    return {
        description: 'Suggest creating a new node with specified parent, title and content. The node will be added at the end of the parent\'s children.',
        inputSchema: z.object({
            parentId: z.string().describe('The ID of the parent node where the new node should be created'),
            title: z.string().describe('The title for the new node'),
            contentHTML: z.string().describe('The HTML content for the new node')
        }),
        execute: async ({parentId, title, contentHTML}: {
            parentId: string;
            title: string;
            contentHTML: string;
        }) => {

            const parentNode: NodeM = treeM.getNode(parentId);
            if (!parentNode || parentNode.nodeTypeName() !== "EditorNodeType") {
                throw new Error(`Parent node ${parentId} not found or is not an editor node`);
            }

            const wrappedContent = sanitizeHtmlForEditor(contentHTML);
            const newNodeMsg = new NewNodeMessage({
                content: `Suggesting new node: "${title}"`,
                role: "assistant",
                author: "Writing Assistant",
                parentId: parentId,
                newNodeTitle: title,
                newContent: wrappedContent,
                treeM: treeM
            });

            setMessages(prevMessages => [...prevMessages, newNodeMsg]);

            return {success: true};
        },
    } as const;
};

export const createGetChildrenListTool = (treeM: any, setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>) => {
    return {
        description: 'Get the list of children nodes (title and ID) for a specific node',
        inputSchema: z.object({
            nodeId: z.string().describe('The ID of the node to get children for')
        }),
        execute: async ({nodeId}: { nodeId: string }) => {

            const node: NodeM = treeM.getNode(nodeId);
            if (!node || node.nodeTypeName() !== "EditorNodeType") {
                throw new Error(`Node ${nodeId} not found or is not an editor node`);
            }

            const children = treeM.getChildren(node).filter((n: NodeM) => n && n.nodeTypeName() === "EditorNodeType") as NodeM[];
            const childrenList = children.map(child => ({
                title: child.title(),
                id: child.id
            }));

            const infoMsg = new InfoMessage(`Getting children list for "${node.title()}" (found ${children.length} children)`);
            setMessages(prevMessages => [...prevMessages, infoMsg]);

            return {
                nodeId,
                parentTitle: node.title(),
                children: childrenList,
                success: true
            };
        },
    } as const;
};

export const createSearchNodeTool = (treeM: TreeM, setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>) => {
    return {
        description: 'Search in the tree to find nodes containing the query text',
        inputSchema: z.object({
            query: z.string().describe('The search query to look for in node titles and content')
        }),
        execute: async ({query}: { query: string }) => {
            let results: SearchResult[] = [];
            try{
                results = SearchService.searchTree(treeM, query);
            } catch (e) {
                console.error(e);
            }

            const searchMsg = new SearchResultMessage({
                content: `Search results for "${query}"`,
                role: "assistant",
                author: "Writing Assistant",
                query: query,
                results: results.slice(0, 10),
                treeM: treeM
            });

            setMessages(prevMessages => [...prevMessages, searchMsg]);

            return {
                query,
                results: results.slice(0, 10),
                success: true
            };
        },
    } as const;
};