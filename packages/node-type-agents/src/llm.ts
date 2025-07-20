import {Message} from "@forest/node-components/src/chat";

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`

// @ts-ignore
const devMode = import.meta.env.MODE === 'development'; // Check if in development mode

export async function fetchChatResponse(messages: Message[], modelName, authToken: string | null): Promise<string> {
    if (messages.length === 0) {
        return "No messages to process.";
    }

    // Check authentication before making API call
    if ((!authToken) && (!devMode)) {
        throw new Error("AUTHENTICATION_REQUIRED");
    }

    const messageOpenAI = messages.map(msg => {
            return {
                role: msg.role,
                content: msg.content
            }
        }
    );

    try {
        const response = await fetch(httpUrl + "/api/llm", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`, // Add JWT token
            },
            body: JSON.stringify({
                messages: messageOpenAI,
                modelName: modelName
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