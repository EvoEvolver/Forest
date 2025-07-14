import React, {useState} from "react";
import {ChatViewImpl, Message} from "./index";
import {XmlElement, XmlText} from "yjs";
import {useAtomValue, useSetAtom} from "jotai";

import {authModalOpenAtom, authTokenAtom, isAuthenticatedAtom} from "@forest/user-system/src/authStates";
import {Button} from "@mui/material";

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`

// @ts-ignore
const devMode = import.meta.env.MODE === 'development'; // Check if in development mode


// Recursively convert DOM nodes to Y.XmlElements
function domToYXmlElement(parentXML, domNode) {
    if (domNode.nodeType === Node.DOCUMENT_NODE) {
        for (const child of domNode.childNodes) {
            domToYXmlElement(parentXML, child);
        }
    } else if (domNode.nodeType === Node.ELEMENT_NODE) {
        const yElement = new XmlElement(domNode.nodeName)
        parentXML.push([yElement])
        // Set attributes
        for (const attr of domNode.attributes) {
            yElement.setAttribute(attr.name, attr.value)
        }

        // Append children
        for (const child of domNode.childNodes) {
            domToYXmlElement(yElement, child)
        }
    } else if (domNode.nodeType === Node.TEXT_NODE) {
        // skip empty text nodes
        if (domNode.textContent && domNode.textContent.trim() === "") {
            return
        }
        parentXML.push([new XmlText(domNode.textContent)])
    } else {
        console.warn("domToYXmlElement", domNode.nodeType)
    }
}


async function fetchChatResponse(messages: Message[], authToken: string | null) {
    if (messages.length === 0) {
        return "No messages to process.";
    }

    // Check authentication before making API call
    if ((!authToken) && (!devMode)) {
        throw new Error("AUTHENTICATION_REQUIRED");
    }

    const messageOpenAI = messages.map(msg => ({
        role: msg.author !== "assistant" ? "user" : "assistant",
        content: msg.content
    }));

    try {
        const response = await fetch(httpUrl + "/api/llm", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`, // Add JWT token
            },
            body: JSON.stringify({
                messages: messageOpenAI
            })
        });

        if (response.status === 401) {
            throw new Error("AUTHENTICATION_FAILED");
        }

        if (response.status === 403) {
            throw new Error("PERMISSION_DENIED");
        }

        if (!response.ok) {
            throw new Error(`HTTP_ERROR_${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            console.error("Error fetching chat response:", data.error);
            return "Error: " + data.error;
        }
        return data.result;
    } catch (error) {
        console.error("Network error:", error);
        throw error; // Re-throw to handle in component
    }
}

export const AiChat: React.FC = ({node}) => {
    const [messages, setMessages] = useState<Message[]>([]);

    // Authentication state
    const authToken = useAtomValue(authTokenAtom);
    const isAuthenticated = useAtomValue(isAuthenticatedAtom);
    const setAuthModalOpen = useSetAtom(authModalOpenAtom);


    const dataKey = "tiptap_editor_" + "paperEditor"
    const editor = node.data[dataKey];

    const sendMessage = async ({content, author, time}: Message) => {
        const messageInList = {content, author, time};
        let messagesToSend = [...messages, messageInList];
        setMessages(prevMessages => [...prevMessages, messageInList]);

        try {
            let newMessage = null
            let editorContentPrompt = null
            if (editor) {
                const editorContent = editor.getHTML();
                editorContentPrompt = `
You are an AI writing assistant who answers questions about a paper manuscript that is being edited. 

The user has provided the following content in the editor: 
<editor_content>${editorContent}</editor_content>
`;
                let newMessageWithEditorContent = {
                    content: editorContentPrompt,
                    author,
                    time
                }
                messagesToSend = [newMessageWithEditorContent, ...messagesToSend];
            }

            // Use the updated messages array from the callback to ensure we have the latest state
            const response = await fetchChatResponse(messagesToSend, authToken);

            const assistantMessage: Message = {
                content: response,
                author: "Chatbot",
                role: "assistant",
                time: new Date().toISOString()
            };

            setMessages(prevMessages => [...prevMessages, assistantMessage]);

            /*if (editor && response) {
                const editorContentMatch = response.match(/<editor_content>([\s\S]*?)<\/editor_content>/);
                const parser = new DOMParser()
                const xmlDoc = parser.parseFromString("<div>[AI generated]"+editorContentMatch[1]+"</div>", 'text/xml')
                console.log(xmlDoc)
                editor.commands.insertContent(xmlDoc.documentElement.innerHTML, false);
            }*/
        } catch (error) {
            // Handle authentication and permission errors
            let errorMessage = "An error occurred while processing your request.";

            if (error.message === "AUTHENTICATION_REQUIRED" || error.message === "AUTHENTICATION_FAILED") {
                errorMessage = "🔐 Please sign in to use AI features";
                setAuthModalOpen(true); // Open login modal
            } else if (error.message === "PERMISSION_DENIED") {
                errorMessage = "🚫 AI access not available. Please upgrade your subscription.";
            } else if (error.message.startsWith("HTTP_ERROR_")) {
                errorMessage = `Server error: ${error.message}`;
            } else {
                //errorMessage = `Network error: ${error.message}`;
                throw error; // Re-throw to handle in component
            }

            // Add error message to chat
            const errorChatMessage = {
                content: errorMessage,
                author: "system",
                time: new Date().toISOString()
            };
            setMessages(prevMessages => [...prevMessages, errorChatMessage]);
        }
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
            <Button onClick={clearMessages} style={{marginBottom: '10px'}}>Clear Messages</Button>
        </>
    );
};
