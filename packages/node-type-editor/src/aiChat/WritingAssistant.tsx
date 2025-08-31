import React, {useEffect, useState} from "react";
import {NodeM, NodeVM} from "@forest/schema";
import {
    BaseMessage,
    InfoMessage,
    MarkdownMessage,
    NormalMessage,
    SystemMessage
} from "@forest/agent-chat/src/MessageTypes";
import {ChatViewImpl} from "@forest/agent-chat/src/ChatViewImpl";
import {useAtomValue} from "jotai";
import {markedNodesAtom} from "@forest/client/src/TreeState/TreeState";
import {EditorNodeTypeM} from "..";
import {WritingMessage} from "./WritingMessage";
import {generateText, stepCountIs} from "ai";
import {z} from "zod";
import {sanitizeHtmlForEditor} from "./helper";
import {getOpenAIInstance} from "@forest/agent-chat/src/llm";

interface ContextualContent {
    originalContent: string;
    parentContent: string;
    markedNodeContent: string;
    childrenInfo: string;
    siblingsInfo: string;
    parent: NodeM | null;
    markedNodesList: NodeM[];
    childrenList: NodeM[];
    siblingsList: NodeM[];
}

interface AIResponse {
    text: string;
    toolResults: any[];
    steps: any[];
}


const getAvailableNodeIds = (contextualContent: ContextualContent, currentNodeId: string): string[] => {
    const {parent, markedNodesList, childrenList, siblingsList} = contextualContent;
    const availableNodeIds = [currentNodeId];

    if (parent && parent.nodeTypeName() === "EditorNodeType") {
        availableNodeIds.push(parent.id);
    }
    availableNodeIds.push(...markedNodesList.map(n => n.id));
    availableNodeIds.push(...childrenList.map(n => n.id));
    availableNodeIds.push(...siblingsList.map(n => n.id));

    return availableNodeIds;
};

const buildAvailableNodeIdsString = (contextualContent: ContextualContent, nodeM: NodeM): string => {
    const {parent, markedNodesList, childrenList, siblingsList} = contextualContent;

    let result = `- Current node (${nodeM.title()}): ${nodeM.id}`;

    if (parent && parent.nodeTypeName() === "EditorNodeType") {
        result += `\n- Parent node (${parent.title()}): ${parent.id}`;
    }
    if (markedNodesList.length > 0) {
        result += `\n- Marked nodes:\n${markedNodesList.map(n => `  - ${n.title()}: ${n.id}`).join('\n')}`;
    }
    if (childrenList.length > 0) {
        result += `\n- Children nodes:\n${childrenList.map(n => `  - ${n.title()}: ${n.id}`).join('\n')}`;
    }
    if (siblingsList.length > 0) {
        result += `\n- Sibling nodes:\n${siblingsList.map(n => `  - ${n.title()}: ${n.id}`).join('\n')}`;
    }

    return result;
};


const getContextualContent = (nodeM: NodeM, markedNodes: Set<string>): ContextualContent => {
    const treeM = nodeM.treeM;
    const originalContent = EditorNodeTypeM.getEditorContent(nodeM);

    const parent = treeM.getParent(nodeM);
    const parentContent = parent && parent.nodeTypeName() === "EditorNodeType"
        ? `<parentContent id="${parent.id}">\n` + EditorNodeTypeM.getEditorContent(parent) + "\n</parentContent>"
        : "";

    let markedNodeContent = ""
    let markedNodesList = Array.from(markedNodes).map(id => treeM.getNode(id)).filter(n => n && n.nodeTypeName() === "EditorNodeType") as NodeM[]
    if (markedNodesList.length > 0) {
        markedNodeContent = "<markedNodes>\n" + markedNodesList.map(child => `Title:${child.title()} (ID: ${child.id})\n` + EditorNodeTypeM.getEditorContent(child)).join("\n-----\n") + "\n</markedNodes>";
    }

    let childrenInfo = "";
    let childrenList: NodeM[] = [];
    childrenList = treeM.getChildren(nodeM).filter((n: NodeM) => n && n.nodeTypeName() === "EditorNodeType") as NodeM[];
    if (childrenList.length > 0) {
        childrenInfo = "<childrenNodes>\n" + childrenList.map(child => `Title: ${child.title()} (ID: ${child.id})`).join("\n") + "\n</childrenNodes>";
    }

    let siblingsInfo = "";
    let siblingsList: NodeM[] = [];
    if (parent) {
        siblingsList = treeM.getChildren(parent).filter((n: NodeM) => n && n.nodeTypeName() === "EditorNodeType" && n.id !== nodeM.id) as NodeM[];
        if (siblingsList.length > 0) {
            siblingsInfo = "<siblingNodes>\n" + siblingsList.map(sibling => `Title: ${sibling.title()} (ID: ${sibling.id})`).join("\n") + "\n</siblingNodes>";
        }
    }

    return {
        originalContent,
        parentContent,
        markedNodeContent,
        childrenInfo,
        siblingsInfo,
        parent,
        markedNodesList,
        childrenList,
        siblingsList
    };
};
const getSystemMessage = (nodeM: NodeM, markedNodes): SystemMessage => {
    const contextualContent = getContextualContent(nodeM, markedNodes);
    const {originalContent, parentContent, markedNodeContent, childrenInfo, siblingsInfo} = contextualContent;
    const availableNodeIds = buildAvailableNodeIdsString(contextualContent, nodeM);

    return new SystemMessage(`
You are a professional writing assistant AI agent that helps user write on a tree structure documents, where each node is a unit of content.

Your context is the following:
<context>
Currently, the user select node (ID: ${nodeM.id}):
<currentContent>
${originalContent}
</currentContent>

${parentContent}

${markedNodeContent}

${childrenInfo}

${siblingsInfo}
</context>

You are here to help the user with writing tasks including:
- Improving and refining existing content
- Providing writing suggestions and feedback
- Generating new content based on user requests
- Answering questions about the current content

Terminology:
- A "node" refers to a single unit of content in the tree structure.
- A "level" refers to all the siblings of the node and the node itself.

Logic of tree structure:
- The parent node should be a summary of its children nodes by default.
- The children nodes should be more detailed and specific than the parent node.
- Bullet points are preferred for any nodes unless the user specifies otherwise.
- The <div> with class "export" is a special container that contains the content generated from other content in that node. It should be considered as a part of the node.

You must 
- You must use tool readNodeContent to get the content of a node first before writing about them.
- If the user asks for writing something, by default, it means that you need to call suggestNewVersion tool to write the content for the current node.
- Don't drop the links in the content. Put every <a></a> link in a proper place with proper content.
- Don't expand an abbreviation by yourself.
- If the user specifies another node, you can also call suggestNewVersion tool to write for that node.
- You don't need to mention what new version you created in your text response, as the user will see the new version directly.

Available node IDs you can create new versions for:
${availableNodeIds}

You can create new versions for any of these nodes - the current node, parent node, marked nodes, children nodes, or sibling nodes. This allows you to suggest improvements to related content beyond just the current node.

Respond naturally and conversationally. You can include regular text explanations along with any new content versions using the tool. Focus on being helpful and collaborative in your writing assistance.
`);
};

const createSuggestNewVersionTool = (nodeM: NodeM, markedNodes, setMessages) => {
    const contextualContent = getContextualContent(nodeM, markedNodes);
    const availableNodeIds = getAvailableNodeIds(contextualContent, nodeM.id);

    return {
        description: 'Suggest a new version of content for a specific node to the user and the user will receive a prompt to accept or modify it before applying.',
        inputSchema: z.object({
            nodeId: z.string().describe('The ID of the node to create new content for'),
            newContentHTML: z.string().describe('The new HTML content for the node'),
            explanation: z.string().optional().describe('Optional explanation of the changes made')
        }),
        execute: async ({nodeId, newContentHTML, explanation}: {
            nodeId: string;
            newContentHTML: string;
            explanation?: string
        }) => {
            if (!availableNodeIds.includes(nodeId)) {
                throw new Error(`Node ID ${nodeId} is not available. Available IDs: ${availableNodeIds.join(', ')}`);
            }
            const wrappedContent = sanitizeHtmlForEditor(newContentHTML)
            const writingMsg = new WritingMessage({
                content: explanation || "",
                role: "assistant",
                author: "Writing Assistant",
                nodeId: nodeId,
                newContent: wrappedContent,
                treeM: nodeM.treeM
            });

            setMessages(prevMessages => [...prevMessages, writingMsg]);

            return {success: true};
        },
    } as const;
};

const createreadNodeContentTool = (nodeM: NodeM, markedNodes, setMessages) => {
    const contextualContent = getContextualContent(nodeM, markedNodes);
    const availableNodeIds = getAvailableNodeIds(contextualContent, nodeM.id);

    return {
        description: 'Get the current content of a specific node to examine it',
        inputSchema: z.object({
            nodeId: z.string().describe('The ID of the node to show content for')
        }),
        execute: async ({nodeId}: { nodeId: string }) => {
            if (!availableNodeIds.includes(nodeId)) {
                throw new Error(`Node ID ${nodeId} is not available. Available IDs: ${availableNodeIds.join(', ')}`);
            }

            const nodeToRead: NodeM = nodeM.treeM.getNode(nodeId);
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

export function WritingAssistant({selectedNode}: { selectedNode: NodeVM }) {
    const [messages, setMessages] = useState<BaseMessage[]>([]);
    const [disabled, setDisabled] = useState(false);
    const node = selectedNode;
    const markedNodes = useAtomValue(markedNodesAtom);

    useEffect(() => {
        setMessages([]);
    }, [selectedNode.nodeM.id]);

    const formatMessagesForAI = (userMessage: string, systemMessage: SystemMessage) => {
        const aiMessages = messages.map(m => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: m.content
        }));

        aiMessages.push({
            role: 'user' as const,
            content: userMessage
        });

        return [
            {
                role: 'system' as const,
                content: systemMessage.content
            },
            ...aiMessages
        ];
    };

    const getNextStep = async (userMessage: string): Promise<AIResponse | undefined> => {
        const nodeM = node.nodeM;
        const systemMessage = getSystemMessage(nodeM, markedNodes);
        const messagesWithSystem = formatMessagesForAI(userMessage, systemMessage);
        const openaiModel = getOpenAIInstance()
        try {
            const result = await generateText({
                model: openaiModel('gpt-4.1'),
                messages: messagesWithSystem,
                tools: {
                    suggestNewVersion: createSuggestNewVersionTool(nodeM, markedNodes, setMessages),
                    readNodeContent: createreadNodeContentTool(nodeM, markedNodes, setMessages)
                },
                stopWhen: stepCountIs(10)
            });

            return {
                text: result.text,
                toolResults: result.steps.flatMap(step => step.toolResults || []),
                steps: result.steps
            };
        } catch (error) {
            console.error('Error in AI generation:', error);
            throw error;
        }
    };

    const handleSuccessfulResponse = (response: AIResponse) => {
        if (response.text && response.text.trim()) {
            const textMsg = new MarkdownMessage({
                content: response.text.trim(),
                role: "assistant",
                author: "Writing Assistant"
            });
            setMessages(prevMessages => [...prevMessages, textMsg]);
        }
        setDisabled(false);
    };

    const handleError = (error: any, messagesWithUserInput: BaseMessage[]) => {
        console.error('Error from writing agent:', error);
        const result = `Error: ${error.message}`;


        const assistantMsg = new MarkdownMessage({
            content: result,
            role: "assistant",
            author: "Writing Assistant"
        });

        const messagesWithAssistant = [...messagesWithUserInput, assistantMsg];
        setMessages(() => messagesWithAssistant);
        setDisabled(false);
    };

    const sendMessage = async (content: string) => {
        const userMsg = new NormalMessage({
            content: content,
            author: "user",
            role: "user"
        });
        const messagesWithUserInput = [...messages, userMsg];
        setMessages(() => messagesWithUserInput);
        setDisabled(true);

        try {
            const response = await getNextStep(content);
            if (!response) {
                throw new Error("No response received");
            }
            handleSuccessfulResponse(response);
        } catch (error) {
            handleError(error, messagesWithUserInput);
        }
    };

    return <>
        <ChatViewImpl
            sendMessage={sendMessage}
            messages={messages}
            messageDisabled={disabled}
        />
    </>
}


