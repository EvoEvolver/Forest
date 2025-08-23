import React, {useState} from "react";
import {NodeM, NodeVM} from "@forest/schema";
import {BaseMessage, MarkdownMessage, NormalMessage, SystemMessage} from "@forest/agent-chat/src/MessageTypes";
import {ChatViewImpl} from "@forest/agent-chat/src/ChatViewImpl";
import {useAtomValue} from "jotai";
import {markedNodesAtom} from "@forest/client/src/TreeState/TreeState";
import {EditorNodeTypeM} from "..";
import {WritingMessage} from "./WritingMessage";
import {createOpenAI} from "@ai-sdk/openai";
import {generateText, stepCountIs} from "ai";
import {z} from "zod";
import {ToolCallingMessage} from "@forest/agent-chat/src/AgentMessageTypes";

const openai = createOpenAI({
    apiKey: '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'
});

export const WritingAssistant: React.FC = ({selectedNode}: { selectedNode: NodeVM }) => {
    const [messages, setMessages] = useState<BaseMessage[]>([]);
    const [disabled, setDisabled] = useState(false);
    const node = selectedNode;
    const markedNodes = useAtomValue(markedNodesAtom);

    const getContextualContent = (nodeM: NodeM) => {
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

    const getSystemMessage = (nodeM: NodeM): SystemMessage => {
        const {originalContent, parentContent, markedNodeContent, childrenInfo, siblingsInfo, parent, markedNodesList, childrenList, siblingsList} = getContextualContent(nodeM);

        // Build available node IDs for new-version tags
        let availableNodeIds = `- Current node (${nodeM.title()}): ${nodeM.id}`;
        if (parent && parent.nodeTypeName() === "EditorNodeType") {
            availableNodeIds += `\n- Parent node (${parent.title()}): ${parent.id}`;
        }
        if (markedNodesList.length > 0) {
            availableNodeIds += `\n- Marked nodes:\n${markedNodesList.map(n => `  - ${n.title()}: ${n.id}`).join('\n')}`;
        }
        if (childrenList.length > 0) {
            availableNodeIds += `\n- Children nodes:\n${childrenList.map(n => `  - ${n.title()}: ${n.id}`).join('\n')}`;
        }
        if (siblingsList.length > 0) {
            availableNodeIds += `\n- Sibling nodes:\n${siblingsList.map(n => `  - ${n.title()}: ${n.id}`).join('\n')}`;
        }

        const systemMessage = new SystemMessage(`
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
- Helping with grammar, style, and structure
- Generating new content based on user requests
- Answering questions about the current content

You must 
- If the user asks for summary, you must use tool showNodeContent to get the content of the node first, then provide summary based on the content.
- If the user asks for writing something, by default, it means that you need to call suggestNewVersion tool to write the content for the current node. 
- If the user specifies another node, you can also call suggestNewVersion tool to write for that node.

You don't need to mention what new version you created in your text response, as the user will see the new version directly.

Available node IDs you can create new versions for:
${availableNodeIds}

You can create new versions for any of these nodes - the current node, parent node, marked nodes, children nodes, or sibling nodes. This allows you to suggest improvements to related content beyond just the current node.

Respond naturally and conversationally. You can include regular text explanations along with any new content versions using the tool. Focus on being helpful and collaborative in your writing assistance.
`);
        return systemMessage;
    };

    const suggestNewVersionTool = () => {
        const {parent, markedNodesList, childrenList, siblingsList} = getContextualContent(node.nodeM);
        
        // Build available node IDs for validation
        const availableNodeIds = [node.nodeM.id];
        if (parent && parent.nodeTypeName() === "EditorNodeType") {
            availableNodeIds.push(parent.id);
        }
        availableNodeIds.push(...markedNodesList.map(n => n.id));
        availableNodeIds.push(...childrenList.map(n => n.id));
        availableNodeIds.push(...siblingsList.map(n => n.id));

        return {
            description: 'Suggest a new version of content for a specific node to the user and the user will receive a prompt to accept or modify it before applying.',
            inputSchema: z.object({
                nodeId: z.string().describe('The ID of the node to create new content for'),
                newContent: z.string().describe('The new HTML content for the node'),
                explanation: z.string().optional().describe('Optional explanation of the changes made')
            }),
            execute: async ({ nodeId, newContent, explanation }: { nodeId: string; newContent: string; explanation?: string }) => {
                // Validate nodeId is available
                if (!availableNodeIds.includes(nodeId)) {
                    throw new Error(`Node ID ${nodeId} is not available. Available IDs: ${availableNodeIds.join(', ')}`);
                }
                
                // Create and add WritingMessage immediately when tool is called
                const writingMsg = new WritingMessage({
                    content: explanation || "",
                    role: "assistant",
                    author: "Writing Assistant",
                    nodeId: nodeId,
                    newContent: newContent,
                    treeM: node.nodeM.treeM
                });
                
                // Add to messages state
                setMessages(prevMessages => [...prevMessages, writingMsg]);
                
                return {
                    success: true
                };
            },
        } as const;
    };

    const showNodeContentTool = () => {
        const {parent, markedNodesList, childrenList, siblingsList} = getContextualContent(node.nodeM);
        
        // Build available node IDs for validation
        const availableNodeIds = [node.nodeM.id];
        if (parent && parent.nodeTypeName() === "EditorNodeType") {
            availableNodeIds.push(parent.id);
        }
        availableNodeIds.push(...markedNodesList.map(n => n.id));
        availableNodeIds.push(...childrenList.map(n => n.id));
        availableNodeIds.push(...siblingsList.map(n => n.id));

        return {
            description: 'Get the current content of a specific node to examine it',
            inputSchema: z.object({
                nodeId: z.string().describe('The ID of the node to show content for')
            }),
            execute: async ({ nodeId }: { nodeId: string }) => {
                // Validate nodeId is available
                if (!availableNodeIds.includes(nodeId)) {
                    throw new Error(`Node ID ${nodeId} is not available. Available IDs: ${availableNodeIds.join(', ')}`);
                }
                
                const nodeM = node.nodeM.treeM.getNode(nodeId);
                if (!nodeM || nodeM.nodeTypeName() !== "EditorNodeType") {
                    throw new Error(`Node ${nodeId} not found or is not an editor node`);
                }
                
                const content = EditorNodeTypeM.getEditorContent(nodeM);
                const title = nodeM.title();

                const writingMsg = new ToolCallingMessage({
                    "toolName": "showNodeContent",
                    "parameters": {"nodeId": nodeId},
                    "author": "Writing Assistant",
                });

                // Add to messages state
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

    const getNextStep = async (userMessage: string): Promise<{
        text: string,
        toolResults: any[],
        steps: any[]
    } | undefined> => {
        const nodeM = node.nodeM;
        const systemMessage = getSystemMessage(nodeM);
        
        // Convert messages to AI SDK format
        const aiMessages = messages.map(m => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: m.content
        }));
        
        // Add current user message
        aiMessages.push({
            role: 'user' as const,
            content: userMessage
        });
        
        // Add system message at the beginning
        const messagesWithSystem = [
            {
                role: 'system' as const,
                content: systemMessage.content
            },
            ...aiMessages
        ];

        try {
            const result = await generateText({
                model: openai('gpt-4.1'),
                messages: messagesWithSystem,
                tools: {
                    suggestNewVersion: suggestNewVersionTool(),
                    showNodeContent: showNodeContentTool()
                },
                stopWhen: stepCountIs(5)
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

    const sendMessage = async (content: string) => {
        const userMsg = new NormalMessage({
            content: content,
            author: "user",
            role: "user"
        });
        const messagesWithUserInput = [...messages, userMsg];
        setMessages(() => messagesWithUserInput);
        setDisabled(true);

        let result: string;

        try {
            const response = await getNextStep(content);
            if (!response) {
                result = "No response received";
            } else {
                // If there's text response, add it as a markdown message
                if (response.text && response.text.trim()) {
                    const textMsg = new MarkdownMessage({
                        content: response.text.trim(),
                        role: "assistant",
                        author: "Writing Assistant"
                    });
                    setMessages(prevMessages => [...prevMessages, textMsg]);
                }
                
                // WritingMessages are already added by the tool execution
                setDisabled(false);
                return;
            }
        } catch (error) {
            console.error('Error from writing agent:', error);
            result = `Error: ${error.message}`;
        }

        // Fallback to regular markdown message
        const assistantMsg = new MarkdownMessage({
            content: result,
            role: "assistant",
            author: "Writing Assistant"
        })

        const messagesWithAssistant = [...messagesWithUserInput, assistantMsg];
        setMessages(() => messagesWithAssistant);
        setDisabled(false);
    };

    return (
        <>
            <ChatViewImpl
                sendMessage={sendMessage}
                messages={messages}
                messageDisabled={disabled}
            />
        </>
    );
};


