import {NodeVM} from "@forest/schema";
import React, {useEffect, useState} from "react";
import {useAtomValue} from "jotai/index";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {Box} from "@mui/material";
import {invokeAgent} from "./agents";
import {agentSessionState} from "./sessionState";
import {BaseMessage, NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {ChatViewImpl} from "@forest/agent-chat/src/ChatViewImpl";
import {AgentNodeType} from "./AgentNode";


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
    const sendMessages =  async (content: string) => {
        const userMsg = new NormalMessage({
            content: content,
            author: "user",
            role: "user"
        });
        agentSessionState.stopFlag = false
        await invokeAgent(node.nodeM, [userMsg])
        agentSessionState.stopFlag = true
    }

    return (
        <Box sx={{width: "100%", height: "60vh"}}>
            <ChatViewImpl messages={messages} sendMessage={sendMessages} messageDisabled={messageDisabled}/>
        </Box>
    );
}
