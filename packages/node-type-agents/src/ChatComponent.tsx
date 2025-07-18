import {NodeM, NodeVM} from "@forest/schema";
import React, {useState} from "react";
import {useAtomValue} from "jotai/index";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {fetchChatResponse} from "./llm";
import {BaseMessage, ChatViewImpl, NormalMessage, SystemMessage} from "@forest/node-components/src/chat";
import {Box} from "@mui/material";
import {AgentNodeType} from "./AgentNode";
import {AgentCallingMessage, AgentResponseMessage} from "./Message";

async function getInitialMessages(nodeM: NodeM, userInput: string) {
    const treeM = nodeM.treeM;
    const agentChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentNodeType");
    const nodeTypeName = nodeM.nodeTypeName()
    const nodeType = await nodeM.treeM.supportedNodesTypes(nodeTypeName) as AgentNodeType;
    const title = nodeM.title();

    const userMsg = new NormalMessage({
        content: userInput,
        author: "user",
        role: "user",
        time: new Date().toISOString(),
    });
    const systemMessage = new SystemMessage(`
You are required to act as a smart AI agent.
Your title as an agent is: ${title}
Your context is the following:
<context>
${nodeType.agentPromptYText(nodeM).toString()}
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
`);
    return [systemMessage, userMsg];
}


async function getNextStep(nodeM: NodeM, messages: BaseMessage[], authToken, setMessages): Promise<string | undefined> {
    const treeM = nodeM.treeM;
    const agentChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentNodeType");
    const messagesToSubmit = messages.map(m => m.toJson());
    let response = await fetchChatResponse(messagesToSubmit as any, authToken);
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
            const agentCallingMessage = new AgentCallingMessage({
                author: "Chatbot",
                agentName: agentName,
                message: agentMessage,
            });
            messages.push(agentCallingMessage);
            setMessages([...messages])
            const agentReply = await getAgentResponse(targetAgentNodeM, agentMessage, authToken, ()=>{});
            
            const agentResponseMessage = new AgentResponseMessage({
                author: "Chatbot",
                agentName: agentName,
                result: agentReply,
            });
            messages.push(agentResponseMessage);
            setMessages([...messages])

        } else {
            throw Error(`Agent ${agentName} not found`);
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
            messages.push(responseMessage);
            setMessages([...messages])
        }

        if (waitUser) {
            return messageContent; // Recursive call, return result
        } else {
            if (messageContent) {
                const responseMessage = new NormalMessage({
                    content: messageContent,
                    author: "Chatbot",
                    role: "assistant",
                    time: new Date().toISOString(),
                });
                messages.push(responseMessage);
                setMessages([...messages])
            }
        }
    } else {
        throw Error(`Unknown response type: ${parsedResponse.type}`);
    }
}

async function getAgentResponse(nodeM: NodeM, userInput, authToken, setMessages) {
    const messages = await getInitialMessages(nodeM, userInput);
    setMessages([...messages]);
    while (true) {
        const messageContent = await getNextStep(nodeM, messages, authToken, setMessages);
        if (messageContent) {
            return messageContent;
        }
    }
}

export function ChatComponent({node}: { node: NodeVM }) {
    const [messages, setMessages] = useState<BaseMessage[]>([])
    const [messageDisabled, setMessageDisabled] = useState(false)
    const authToken = useAtomValue(authTokenAtom);


    // Wrapper for ChatViewImpl: (message: Message) => Promise<void>
    const sendMessages = async (message: { content: string; author: string; role: string; }) => {
        setMessageDisabled(true);
        await getAgentResponse(node.nodeM, message.content, authToken, setMessages)
        setMessageDisabled(false);
    }

    return (
        <Box sx={{width: "100%", height: "400px"}}>
            <ChatViewImpl messages={messages} sendMessage={sendMessages} messageDisabled={messageDisabled}/>
        </Box>
    );
}
