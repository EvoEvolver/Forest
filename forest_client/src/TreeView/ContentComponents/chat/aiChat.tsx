import React, {useContext, useState} from "react";
import {thisNodeContext} from "../../NodeContentTab";
import {ChatViewImpl} from "./index";
import {httpUrl} from "../../../App";

interface Message {
    content: string;
    author: string;
    time: string;
}

async function fetchChatResponse(messages: Message[]) {
    const messageOpenAI = messages.map(msg => ({
        role: msg.author !== "assistant" ? "user" : "assistant",
        content: msg.content
    }));

    try {
        const response = await fetch(httpUrl + "/api/llm", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: messageOpenAI
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error("Error fetching chat response:", data.error);
            return "Error: " + data.error;
        }
        return data.result;
    } catch (error) {
        console.error("Network error:", error);
        return "Error: Failed to fetch response" + error.message;
    }
}

export const AiChat: React.FC = (props) => {
    const node = useContext(thisNodeContext);
    const [messages, setMessages] = useState<Message[]>([]);

    const sendMessage = async ({content, author, time}: Message) => {
        const newMessage = {content, author, time};
        setMessages(prevMessages => [...prevMessages, newMessage]);

        // Use the updated messages array from the callback to ensure we have the latest state
        const response = await fetchChatResponse([...messages, newMessage]);

        const assistantMessage = {
            content: response,
            author: "assistant",
            time: new Date().toISOString()
        };

        setMessages(prevMessages => [...prevMessages, assistantMessage]);
    };

    const clearMessages = () => {
        setMessages([]);
    };

    return (
        <>
            <ChatViewImpl
                sendMessage={sendMessage}
                messages={messages}
                messageDisabled={false}
            />
            <button onClick={clearMessages} style={{marginBottom: '10px'}}>Clear Messages</button>
        </>
    );
};
