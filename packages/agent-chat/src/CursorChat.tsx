import React, {useState} from "react";
import {useAtomValue} from "jotai";

import {authTokenAtom} from "@forest/user-system/src/authStates";
import {fetchChatResponse} from "./llm";
import {NodeVM} from "@forest/schema";
import {ChatViewImpl} from "./ChatViewImpl";
import {BaseMessage, NormalMessage} from "./MessageTypes";

export const CursorChat: React.FC = ({selectedNode}: { selectedNode: NodeVM }) => {
    const [messages, setMessages] = useState<BaseMessage[]>([]);
    const [disabled, setDisabled] = useState(false);
    const node = selectedNode
    // Authentication state
    const authToken = useAtomValue(authTokenAtom);

    const sendMessage = async (content: string) => {
        const userMsg = new NormalMessage({
            content: content,
            author: "user",
            role: "user",
            time: new Date().toISOString()
        });
        const messagesWithUserInput = [...messages, userMsg];
        setMessages(() => messagesWithUserInput);
        setDisabled(true);
        const result = await fetchChatResponse(messagesWithUserInput.map((m) => m.toJson()), "gpt-4.1", authToken)
        const assistantMsg = new NormalMessage({
            content: result,
            role: "assistant",
            time: new Date().toISOString(),
            author: "assistant"
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
