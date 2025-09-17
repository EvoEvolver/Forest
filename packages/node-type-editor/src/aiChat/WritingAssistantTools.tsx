import React from "react";
import {NodeM} from "@forest/schema";
import {z} from "zod";
import {BaseMessage, InfoMessage} from "@forest/agent-chat/src/MessageTypes";
import {EditorNodeTypeM} from "..";
import {TitleMessage, NewNodeMessage} from "./WritingMessage";
import {sanitizeHtmlForEditor} from "./helper";

export const createLoadNodeContentTool = (availableNodeIds: string[], treeM: any, setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>) => {
    return {
        description: 'Get the current content of a specific node to examine it',
        inputSchema: z.object({
            nodeId: z.string().describe('The ID of the node to show content for')
        }),
        execute: async ({nodeId}: { nodeId: string }) => {
            if (!availableNodeIds.includes(nodeId)) {
                throw new Error(`Node ID ${nodeId} is not available. Available IDs: ${availableNodeIds.join(', ')}`);
            }

            const nodeToRead: NodeM = treeM.getNode(nodeId);
            if (!nodeToRead || nodeToRead.nodeTypeName() !== "EditorNodeType") {
                throw new Error(`Node ${nodeId} not found or is not an editor node`);
            }

            const content = EditorNodeTypeM.getEditorContent(nodeToRead);
            const title = nodeToRead.title();

            const writingMsg = new InfoMessage("Reading " + title);

            setMessages(prevMessages => [...prevMessages, writingMsg]);

            return {
                nodeId,
                title,
                content,
                success: true
            };
        },
    } as const;
};

export const createSuggestNewTitleTool = (availableNodeIds: string[], treeM: any, setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>) => {
    return {
        description: 'Suggest a new title for a specific node',
        inputSchema: z.object({
            nodeId: z.string().describe('The ID of the node to suggest a new title for'),
            newTitle: z.string().describe('The new title for the node')
        }),
        execute: async ({nodeId, newTitle}: { nodeId: string; newTitle: string }) => {
            if (!availableNodeIds.includes(nodeId)) {
                throw new Error(`Node ID ${nodeId} is not available. Available IDs: ${availableNodeIds.join(', ')}`);
            }

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

export const createSuggestNewNodeTool = (availableNodeIds: string[], treeM: any, setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>) => {
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
            if (!availableNodeIds.includes(parentId)) {
                throw new Error(`Parent node ID ${parentId} is not available. Available IDs: ${availableNodeIds.join(', ')}`);
            }

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