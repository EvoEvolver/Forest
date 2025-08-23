import React, {useState} from "react";
import {NodeM, NodeVM} from "@forest/schema";
import {httpUrl} from "@forest/schema/src/config";
import {treeId} from "@forest/client/src/appState";
import {BaseMessage, HtmlMessage, MarkdownMessage, NormalMessage, SystemMessage} from "@forest/agent-chat/src/MessageTypes";
import {ChatViewImpl} from "@forest/agent-chat/src/ChatViewImpl";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {markedNodesAtom} from "@forest/client/src/TreeState/TreeState";
import {EditorNodeTypeM} from "..";

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
        let markedNodesList = Array.from(markedNodes).map(id=>treeM.getNode(id)).filter(n=>n && n.nodeTypeName() === "EditorNodeType") as NodeM[]
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

Your response must adopt the following JSON format:
You must only output JSON

<answer_user>
{
 "type": "answer_user",
 "message": the message to the user
}
</answer_user>
`);
        return systemMessage;
    };

    const getNextStep = async (userMessage: string): Promise<string | undefined> => {
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
            return parsedResponse.message;
        } else {
            return response; // fallback to raw response
        }
    };

    const sendTreeToSuperReader = async (question: string) => {
        try {
            const response = await fetch(WORKER_URL+'/search_and_answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: question,
                    treeUrl: `${httpUrl}/?id=${treeId}`,
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.answer || 'No answer received';
        } catch (error) {
            console.error('Error sending tree to worker:', error);
            return `Error: ${error.message}`;
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
            // Use the new agent system instead of the super reader
            result = await getNextStep(content) || "No response received";
        } catch (error) {
            console.error('Error from writing agent:', error);
            result = `Error: ${error.message}`;
        }

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
