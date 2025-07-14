import {NodeVM} from "@forest/schema";
import React, {useState} from "react";
import {useAtomValue} from "jotai/index";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {fetchChatResponse} from "./llm";
import {ChatViewImpl, Message} from "@forest/node-components/src/chat";
import {Box} from "@mui/material";
import {AgentNodeType} from "./AgentNode";

export function ChatComponent({node}: { node: NodeVM }) {
    const [messages, setMessages] = useState([])
    const [messageDisabled, setMessageDisabled] = useState(false)
    const authToken = useAtomValue(authTokenAtom);
    const nodeType = node.nodeType as AgentNodeType

    const sendMessages = async (message) => {
        const messagesAfterInput = [...messages, message]
        setMessages(messagesAfterInput)
        setMessageDisabled(true)
        const systemMessage = {
            content: nodeType.agentPromptYText(node).toString(),
            author: "",
            role: "system",
            time: new Date().toISOString()
        }
        const messagesToSubmit = [systemMessage, ...messagesAfterInput]
        const response = await fetchChatResponse(messagesToSubmit, authToken)
        const assistantMessage: Message = {
            content: response,
            author: "Chatbot",
            role: "assistant",
            time: new Date().toISOString()
        };
        const messagesAfterResponse = [...messagesAfterInput, assistantMessage]
        setMessages(messagesAfterResponse)
        setMessageDisabled(false)
    }

    return <>
        <Box sx={{width: "100%", height: "400px"}}>
            <ChatViewImpl messages={messages} sendMessage={sendMessages} messageDisabled={messageDisabled}/>
        </Box>
    </>
}