import {NodeM, NodeVM} from "@forest/schema";
import React, {useState} from "react";
import {useAtomValue} from "jotai/index";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {fetchChatResponse} from "./llm";
import {BaseMessage, ChatViewImpl, NormalMessage} from "@forest/node-components/src/chat";
import {Box} from "@mui/material";
import {AgentNodeType} from "./AgentNode";
import {AgentCallingMessage, AgentResponseMessage} from "./Message";

export function ChatComponent({node}: { node: NodeVM }) {
    const [messages, setMessages] = useState<BaseMessage[]>([])
    const [messageDisabled, setMessageDisabled] = useState(false)
    const authToken = useAtomValue(authTokenAtom);
    // Recursively send messages, handling agent calling
    const sendMessagesRecursive = async (
        message: { content: string; author: string; role: string; },
        currentNode: NodeM,
        parentMessages?: BaseMessage[]
    ): Promise<string | null> => {

        const treeM = currentNode.treeM;
        const nodeM = currentNode;
        const nodeTypeName = nodeM.nodeTypeName()
        const nodeType = await nodeM.treeM.supportedNodesTypes(nodeTypeName) as AgentNodeType;
        const agentChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentNodeType");
        const title = nodeM.title();

        // Use parentMessages for recursion, otherwise use state
        const baseMessages = parentMessages || messages;
        const userMsg = new NormalMessage({
            content: message.content,
            author: message.author,
            role: message.role as any,
            time: new Date().toISOString(),
        });
        const messagesAfterInput = [...baseMessages, userMsg];
        if (!parentMessages) {
            setMessages(messagesAfterInput);
        }
        const systemMessage = new NormalMessage({
            content: `
You are required to act as a smart AI agent.
Your title as an agent is: ${title}
Your context is the following:
<context>
${nodeType.agentPromptYText(currentNode).toString()}
</context>
You can get help from the following agents:
<agents>
${agentChildren.map(child => child.title()).join('\n')}
</agents>
You are required to response to the request from the user.
Your response must adopt one of the following JSON formats
You must only output JSON
<agent_calling>
{
 "type": "agent_calling",
 "agent_name": "agent name in string",
 "message": "the message to the agent"
}
</agent_calling>
<user_response>
{
 "type": "user_response",
 "message": "the message to the user",
 "wait_user": true or false, if true, you stop and wait user for further instruction
}
</user_response>
`,
            author: "",
            role: "system",
            time: new Date().toISOString(),
        });

        const messagesToSubmit = [systemMessage, ...messagesAfterInput].map(m => m.toJson());
        let response = await fetchChatResponse(messagesToSubmit as any, authToken);

        // take the string between first { and last }
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
            parsedResponse = {type: "user_response", message: response, wait_user: true};
        }

        if (parsedResponse.type === "agent_calling") {
            const agentName = parsedResponse.agent_name;
            const agentMessage = parsedResponse.message;
            // Find the child agent node by title
            const targetAgentNodeM = agentChildren.find(child => child.title() === agentName);
            if (targetAgentNodeM) {
                // Convert NodeM to NodeVM for recursion
                const agentCallingMessage = new AgentCallingMessage({
                    author: "Chatbot",
                    agentName: agentName,
                    message: agentMessage,
                });
                setMessages(prev => [...prev, agentCallingMessage]);

                const agentReply = await sendMessagesRecursive({
                    content: agentMessage,
                    author: "Agent",
                    role: "user"
                }, targetAgentNodeM, messagesAfterInput);

                if (agentReply) {
                    const agentResponseMessage = new AgentResponseMessage({
                        author: "Chatbot",
                        agentName: agentName,
                        result: agentReply,
                    });
                    setMessages(prev => [...prev, agentResponseMessage]);
                }

                if (!parentMessages) {
                    return null;
                }
                return agentReply;
            } else {
                const notFoundMsg = `Agent \"${parsedResponse.agent_name}\" not found.`;
                return notFoundMsg;
            }
        } else if (parsedResponse.type === "user_response") {
            const messageContent = parsedResponse.message;
            const waitUser = parsedResponse.wait_user ?? true;

            if (messageContent) {
                const responseMessage = new NormalMessage({
                    content: messageContent,
                    author: "Chatbot",
                    role: "assistant",
                    time: new Date().toISOString(),
                });
                setMessages(prev => [...prev, responseMessage]);
            }

            if (waitUser) {
                if (!parentMessages) { // Top-level call
                    return null;
                }
                return messageContent; // Recursive call, return result
            } else {
                // Continue execution
                const continueMessage = {
                    content: "Continue, what is the next step?",
                    author: "system",
                    role: "user"
                };

                const newHistory = [...messagesAfterInput];
                if (messageContent) {
                    const responseMessage = new NormalMessage({
                        content: messageContent,
                        author: "Chatbot",
                        role: "assistant",
                        time: new Date().toISOString(),
                    });
                    newHistory.push(responseMessage);
                }
                
                const result = await sendMessagesRecursive(
                    continueMessage,
                    currentNode,
                    newHistory
                );

                if (!parentMessages) { // Top-level call
                    return null;
                }
                return result;
            }
        } else {
            // fallback: treat as plain string
            return response;
        }
    }

    // Wrapper for ChatViewImpl: (message: Message) => Promise<void>
    const sendMessages = async (message: { content: string; author: string; role: string; }) => {
        setMessageDisabled(true);
        const reply = await sendMessagesRecursive(message, node.nodeM);
        if (reply) {
            setMessages(prev => {
                return [...prev, new NormalMessage({
                    content: reply,
                    author: "Chatbot",
                    role: "assistant",
                    time: new Date().toISOString(),
                })];
            });
        }
        setMessageDisabled(false);
    }

    return (
        <Box sx={{width: "100%", height: "400px"}}>
            <ChatViewImpl messages={messages} sendMessage={sendMessages} messageDisabled={messageDisabled}/>
        </Box>
    );
}