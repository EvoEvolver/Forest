import React, {useState} from "react";
import {NodeVM} from "@forest/schema";
import {ChatViewImpl} from "./ChatViewImpl";
import {BaseMessage, HtmlMessage, NormalMessage} from "./MessageTypes";
import {httpUrl} from "@forest/schema/src/config";
import {treeId} from "@forest/client/src/appState";

// @ts-ignore
const WORKER_URL = import.meta.env.VITE_WORKER_URL;

export const CursorChat: React.FC = ({selectedNode}: { selectedNode: NodeVM }) => {
    const [messages, setMessages] = useState<BaseMessage[]>([]);
    const [disabled, setDisabled] = useState(false);
    const node = selectedNode

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
            role: "user",
            time: new Date().toISOString()
        });
        const messagesWithUserInput = [...messages, userMsg];
        setMessages(() => messagesWithUserInput);
        setDisabled(true);

        let result: string;

        result = await sendTreeToSuperReader(content);

        const assistantMsg = new HtmlMessage({
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
