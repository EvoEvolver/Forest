import {NodeVM} from "@forest/schema";
import React, {useEffect, useState} from "react";
import {useAtomValue} from "jotai/index";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {BaseMessage, ChatViewImpl, NormalMessage} from "@forest/node-components/src/chat";
import {Box} from "@mui/material";
import {invokeAgent} from "./agents";
import {agentSessionState} from "./sessionState";


export function ChatComponent({node}: { node: NodeVM }) {
    const [messages, setMessages] = useState<BaseMessage[]>([])
    const [messageDisabled, setMessageDisabled] = useState(false)
    const authToken = useAtomValue(authTokenAtom);
    useEffect(() => {
        agentSessionState.authToken = authToken
        setMessages(agentSessionState.messages.get(node.id) || []);
        agentSessionState.updateCallback.set(node.id, () => {
            console.log("Updating chat component", node.id)
            setMessages([...(agentSessionState.messages.get(node.id) || [])])
        });
        return () => {
            agentSessionState.updateCallback.delete(node.id);
        }
    }, []);

    // Wrapper for ChatViewImpl: (message: Message) => Promise<void>
    const sendMessages =  (message: { content: string; author: string; role: string; }) => {
        const userMsg = new NormalMessage({
            content: message.content,
            author: "user",
            role: "user",
            time: new Date().toISOString()
        });
        invokeAgent(node.nodeM, [userMsg])
    }

    return (
        <Box sx={{width: "100%", height: "800px"}}>
            <ChatViewImpl messages={messages} sendMessage={sendMessages} messageDisabled={messageDisabled}/>
        </Box>
    );
}
