import React, {useState} from "react";
import {NodeM, NodeVM} from "@forest/schema";
import {BaseMessage, MarkdownMessage, NormalMessage, SystemMessage} from "@forest/agent-chat/src/MessageTypes";
import {ChatViewImpl} from "@forest/agent-chat/src/ChatViewImpl";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {markedNodesAtom} from "@forest/client/src/TreeState/TreeState";
import {EditorNodeTypeM} from "..";
import {WritingMessage} from "./WritingMessage";

// @ts-ignore
const WORKER_URL = import.meta.env.VITE_WORKER_URL;

export const WritingAssistant: React.FC = ({selectedNode}: { selectedNode: NodeVM }) => {
    const [messages, setMessages] = useState<BaseMessage[]>([]);
    const [disabled, setDisabled] = useState(false);
    const [includeChildren, setIncludeChildren] = useState(false);
    const [includeSiblings, setIncludeSiblings] = useState(false);
    const node = selectedNode;
    const authToken = useAtomValue(authTokenAtom);
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

        let childrenContent = "";
        let childrenList: NodeM[] = [];
        if (includeChildren) {
            childrenList = treeM.getChildren(nodeM).filter((n: NodeM) => n && n.nodeTypeName() === "EditorNodeType") as NodeM[];
            if (childrenList.length > 0) {
                childrenContent = "<childrenNodes>\n" + childrenList.map(child => `Title:${child.title()} (ID: ${child.id})\n` + EditorNodeTypeM.getEditorContent(child)).join("\n-----\n") + "\n</childrenNodes>";
            }
        }

        let siblingsContent = "";
        let siblingsList: NodeM[] = [];
        if (includeSiblings && parent) {
            siblingsList = treeM.getChildren(parent).filter((n: NodeM) => n && n.nodeTypeName() === "EditorNodeType" && n.id !== nodeM.id) as NodeM[];
            if (siblingsList.length > 0) {
                siblingsContent = "<siblingNodes>\n" + siblingsList.map(sibling => `Title:${sibling.title()} (ID: ${sibling.id})\n` + EditorNodeTypeM.getEditorContent(sibling)).join("\n-----\n") + "\n</siblingNodes>";
            }
        }

        return {
            originalContent,
            parentContent,
            markedNodeContent,
            childrenContent,
            siblingsContent,
            parent,
            markedNodesList,
            childrenList,
            siblingsList
        };
    };

    const getSystemMessage = (nodeM: NodeM): SystemMessage => {
        const {originalContent, parentContent, markedNodeContent, childrenContent, siblingsContent, parent, markedNodesList, childrenList, siblingsList} = getContextualContent(nodeM);

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

${childrenContent}

${siblingsContent}
</context>

You are here to help the user with writing tasks including:
- Improving and refining existing content
- Providing writing suggestions and feedback
- Helping with grammar, style, and structure
- Generating new content based on user requests
- Answering questions about the current content

When you provide a new or improved version of content, wrap it in <new-version id="NODE_ID"> tags with the appropriate node ID. The content inside <new-version> tags should be HTML.

Available node IDs you can create new versions for:
${availableNodeIds}

You can create new versions for any of these nodes - the current node, parent node, marked nodes, children nodes, or sibling nodes. This allows you to suggest improvements to related content beyond just the current node.

Respond naturally and conversationally. You can include regular text explanations along with any new content versions. Focus on being helpful and collaborative in your writing assistance.
`);
        return systemMessage;
    };

    const getNextStep = async (userMessage: string): Promise<{
        message: string,
        hasNewVersion: boolean
    } | undefined> => {
        const nodeM = node.nodeM;
        const systemMessage = getSystemMessage(nodeM);
        const userMsg = new NormalMessage({
            content: userMessage,
            author: "user",
            role: "user"
        });

        const messagesWithSystem = [...messages, userMsg, systemMessage];
        const messagesToSubmit = messagesWithSystem.map(m => m.toJson());

        console.log("messagesToSubmit", messagesToSubmit);
        let response = await fetchChatResponse(messagesToSubmit as any, "gpt-4.1", authToken);
        console.log("response", response);

        return {
            message: response,
            hasNewVersion: response.includes('<new-version')
        };
    };

    const parseNewVersionTags = (message: string) => {
        const newVersionRegex = /<new-version\s+id="([^"]+)">([^<]*(?:<(?!\/new-version>)[^<]*)*)<\/new-version>/gi;
        const segments = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        // Reset regex for global matching
        newVersionRegex.lastIndex = 0;

        while ((match = newVersionRegex.exec(message)) !== null) {
            // Add text before the new-version tag
            const beforeText = message.substring(lastIndex, match.index).trim();
            if (beforeText) {
                segments.push({
                    type: 'text',
                    content: beforeText
                });
            }

            // Add the new-version segment
            segments.push({
                type: 'new-version',
                nodeId: match[1],
                newContent: match[2].trim()
            });

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after the last new-version tag
        const afterText = message.substring(lastIndex).trim();
        if (afterText) {
            segments.push({
                type: 'text',
                content: afterText
            });
        }

        return segments;
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
            // Use the new agent system instead of the super reader
            const response = await getNextStep(content);
            if (!response) {
                result = "No response received";
            } else {
                result = response.message;

                // Check if there are new-version tags to parse
                if (response.hasNewVersion) {
                    const segments = parseNewVersionTags(response.message);

                    if (segments.length > 0) {
                        const newMessages = [...messagesWithUserInput];

                        // Create messages for each segment
                        segments.forEach(segment => {
                            if (segment.type === 'text') {
                                const textMsg = new MarkdownMessage({
                                    content: segment.content,
                                    role: "assistant",
                                    author: "Writing Assistant"
                                });
                                newMessages.push(textMsg);
                            } else if (segment.type === 'new-version') {
                                const writingMsg = new WritingMessage({
                                    content: "", // No additional content for pure writing message
                                    role: "assistant",
                                    author: "Writing Assistant",
                                    nodeId: segment.nodeId,
                                    newContent: segment.newContent,
                                    treeM: node.nodeM.treeM
                                });
                                newMessages.push(writingMsg);
                            }
                        });

                        setMessages(() => newMessages);
                        setDisabled(false);
                        return;
                    }
                }
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
            <div style={{ padding: '8px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f5f5f5', display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input
                        type="checkbox"
                        checked={includeChildren}
                        onChange={(e) => setIncludeChildren(e.target.checked)}
                    />
                    Include children nodes in context
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input
                        type="checkbox"
                        checked={includeSiblings}
                        onChange={(e) => setIncludeSiblings(e.target.checked)}
                    />
                    Include sibling nodes in context
                </label>
            </div>
            <ChatViewImpl
                sendMessage={sendMessage}
                messages={messages}
                messageDisabled={disabled}
            />
        </>
    );
};


