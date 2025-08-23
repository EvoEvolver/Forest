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
    const node = selectedNode;
    const authToken = useAtomValue(authTokenAtom);
    const markedNodes = useAtomValue(markedNodesAtom);

    const getContextualContent = (nodeM: NodeM) => {
        const treeM = nodeM.treeM;
        const originalContent = EditorNodeTypeM.getEditorContent(nodeM);

        const parent = treeM.getParent(nodeM);
        const parentContent = parent && parent.nodeTypeName() === "EditorNodeType"
            ? "<parentContent>\n" + EditorNodeTypeM.getEditorContent(parent) + "\n</parentContent>"
            : "";

        let markedNodeContent = ""
        let markedNodesList = Array.from(markedNodes).map(id => treeM.getNode(id)).filter(n => n && n.nodeTypeName() === "EditorNodeType") as NodeM[]
        if (markedNodesList.length > 0) {
            markedNodeContent = "<markedNodes>\n" + markedNodesList.map(child => "Title:" + child.title() + "\n" + EditorNodeTypeM.getEditorContent(child)).join("\n-----\n") + "\n</markedNodes>";
        }

        return {
            originalContent,
            parentContent,
            markedNodeContent
        };
    };

    const getSystemMessage = (nodeM: NodeM): SystemMessage => {
        const {originalContent, parentContent, markedNodeContent} = getContextualContent(nodeM);

        const systemMessage = new SystemMessage(`
You are a professional writing assistant AI agent.
Your title as an agent is: Writing Assistant for ${nodeM.title()}

Your context is the following:
<context>
Current content you are helping with:
<currentContent>
${originalContent}
</currentContent>

${parentContent}

${markedNodeContent}
</context>

You are required to help the user with writing tasks including:
- Improving and refining existing content
- Providing writing suggestions and feedback
- Helping with grammar, style, and structure
- Generating new content based on user requests
- Answering questions about the current content

When you provide a new or improved version of content, wrap it in <new-version id="${nodeM.id}"> tags with the current node ID. The content inside <new-version> tags should be HTML.

Your response must adopt the following JSON format:
You must only output JSON

<answer_user>
{
 "type": "answer_user",
 "message": the message to the user (can include <new-version id="NODE_ID">new content</new-version> tags)
}
</answer_user>
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

        try {
            response = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
        } catch (e) {
            // ignore if no json
        }

        // Try to parse the response as JSON
        let parsedResponse: any;
        try {
            parsedResponse = JSON.parse(response);
        } catch {
            parsedResponse = {type: "answer_user", message: response};
        }
        console.log("parsedResponse", parsedResponse);

        if (parsedResponse.type === "answer_user") {
            return {
                message: parsedResponse.message,
                hasNewVersion: parsedResponse.message.includes('<new-version')
            };
        } else {
            return {
                message: response,
                hasNewVersion: false
            }; // fallback to raw response
        }
    };

    const parseNewVersionTags = (message: string) => {
        const newVersionRegex = /<new-version\s+id="([^"]+)">([^<]*(?:<(?!\/new-version>)[^<]*)*)<\/new-version>/gi;
        const segments = [];
        let lastIndex = 0;
        let match;

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
            <ChatViewImpl
                sendMessage={sendMessage}
                messages={messages}
                messageDisabled={disabled}
            />
        </>
    );
};


