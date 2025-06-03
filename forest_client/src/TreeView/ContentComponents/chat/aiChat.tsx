import React, {useContext, useState} from "react";
import {thisNodeContext} from "../../NodeContentTab";
import {ChatViewImpl} from "./index";
import {httpUrl} from "../../../App";
import {XmlFragment, XmlText, XmlElement} from "yjs";

interface Message {
    content: string;
    author: string;
    time: string;
}


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
        parentXML.push([new XmlText(domNode.textContent)])
    }
    else{
        console.warn("domToYXmlElement", domNode.nodeType)
    }
}


async function fetchChatResponse(messages: Message[]) {
    // if last message is 123, return "123"
    if (messages.length === 0) {
        return "No messages to process.";
    }
    if (messages[messages.length - 1].content === "123") {
        return `<editor_content><paragraph>1<aiGenerated>333</aiGenerated>1</paragraph></editor_content>`
    }
    if (messages[messages.length - 1].content === "1") {
        return messages[0].content
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

    const ydataKey = "ydata" + "paperEditor"
    let yXML = node.ydata.get(ydataKey);


    const sendMessage = async ({content, author, time}: Message) => {
        const messageInList = {content, author, time};
        let messagesToSend = [...messages, messageInList];
        setMessages(prevMessages => [...prevMessages, messageInList]);
        let newMessage = null
        let editorContentPrompt = null
        if (yXML) {
            const editorContent = yXML.toJSON()
            editorContentPrompt =  `You are an AI writing assistant who help the user to write an article in an editor. You are required to directly output the content the user required based on what the user has input. The output should follow the same format as the input and surrounded by <editor_content>. The user has provided the following content in the editor: `;
            editorContentPrompt += `<editor_content>${editorContent}</editor_content>`;
            let newMessageWithEditorContent = {
                content: editorContentPrompt,
                author,
                time
            }
            messagesToSend = [newMessageWithEditorContent, ...messagesToSend];
        }
        // Use the updated messages array from the callback to ensure we have the latest state
        const response = await fetchChatResponse(messagesToSend);
        
        const assistantMessage = {
            content: response,
            author: "assistant",
            time: new Date().toISOString()
        };

        setMessages(prevMessages => [...prevMessages, assistantMessage]);

        if (yXML && response) {
            const editorContentMatch = response.match(/<editor_content>([\s\S]*?)<\/editor_content>/);
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString("<div>"+editorContentMatch[1]+"</div>", 'text/xml')
            console.log(xmlDoc)
            yXML.doc.transact(() => {
                for(let child of xmlDoc.childNodes[0].childNodes) {
                    console.log("child", child)
                    domToYXmlElement(yXML, child)
                }
            }, "ai agent")
            /*const yElements = Array.from(xmlDoc.childNodes).map((child) => domToYXmlElement(child))
            yXML.push(yElements);
            for (const yElement of yElements) {
                console.log(yElement.toJSON())
            }*/
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
            <button onClick={clearMessages} style={{marginBottom: '10px'}}>Clear Messages</button>
        </>
    );
};
