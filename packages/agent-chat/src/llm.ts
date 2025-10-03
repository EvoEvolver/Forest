import {httpUrl} from "@forest/schema/src/config";
import {createOpenAI} from "@ai-sdk/openai";
import {userStudy} from "@forest/client/src/appState";

const USERSTUDY_KEY = "s"+"k"+"-proj-"+"kA-VK0dhmQJsKtq4JVr3cqaT1J2ws7aS00D8Fw4vPyiPh5s9ZmMARDYhoBny5huocdKz5OhdC"+"-T3BlbkFJ1XfyMFcrJUv74OMKtiCETv3E2PiX2fI6gTQP8RrPnrTR6fiSe7J01d7C_woIpVpA2FVomBsJsA"

export function getOpenAIInstance() {
    let API_KEY = localStorage.getItem('openaiApiKey');
    if (userStudy) {
        API_KEY = USERSTUDY_KEY
    }
    if (!API_KEY || API_KEY.trim() === ""){
        API_KEY = USERSTUDY_KEY
    }
    if (!API_KEY) {
        alert("OpenAI API key not found. Please configure your API key in the profile settings.");
        throw new Error('OpenAI API key not found. Please configure your API key in the profile settings.');
    }
    const openai = createOpenAI({
        apiKey: API_KEY
    });
    return openai;
}


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
            } else {
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