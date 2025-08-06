import {httpUrl} from "@forest/schema/src/config";

export async function fetchChatResponse(messages: { role: string, content: string }[],
                                        modelName,
                                        authToken: string | null): Promise<string> {
    if (messages.length === 0) {
        return "No messages to process.";
    }

    const messageOpenAI = messages.map(msg => {
            if (msg) {
                return {
                    role: msg.role,
                    content: msg.content
                }
            }
            else {
                return null
            }
        }
    ).filter(Boolean)

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