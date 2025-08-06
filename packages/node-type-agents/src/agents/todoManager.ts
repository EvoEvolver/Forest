import {NodeM} from "@forest/schema";
import {generateActionListPrompt} from "./index";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {agentSessionState} from "../sessionState";
import {BaseMessage, SystemMessage} from "@forest/agent-chat/src/MessageTypes";

export async function decomposeTask(
    instruction: string,
    node: NodeM
): Promise<string> {
    const actionsPrompt = await generateActionListPrompt(node, []);

    const todoGenerationPrompt = `
        Analyze the following instruction and break it down into a actionable markdown todo list.
        You must ensure that the todo list you generate can be solved by the tools
        
        Query from the user: ${instruction}
        
        Available Tools:
        ${actionsPrompt || "No tools available"}
        
        Rules:
        - Use [ ] for incomplete tasks in markdown format
        - Each task should specify which tool to use from the available tools
        - The steps should be actionable with the available tools
        - Keep tasks focused and specific
        - The todo list can be as simple as one or two items
        
        Return only the markdown todo list, nothing else:
        - [ ] Task 1
        - [ ] Task 2 
    `;

    try {
        const systemMessage = new SystemMessage(todoGenerationPrompt);
        const messages = [systemMessage];
        const response = await fetchChatResponse(messages.map(m => m.toJson()) as any, "gpt-4.1", agentSessionState.authToken);
        return response.trim();
    } catch (error) {
        console.error("Error generating todo list:", error);
        return "";
    }
}

export async function updateTodoListAfterTask(
    currentTodoList: string,
    messages: BaseMessage[],
): Promise<string> {
    if (!currentTodoList) {
        return currentTodoList;
    }

    const updatePrompt = `
        Current todo list:
        ${currentTodoList}
   
        Please update the todo list based on the message history:
        1. Mark the completed task with [x] instead of [ ]
        2. If the result suggests new tasks are needed, add them as new [ ] items
        Only return the updated todo list, nothing else
    `;


    const systemMessage = new SystemMessage(updatePrompt);
    const messagesToSubmit = [...messages, systemMessage];
    const response = await fetchChatResponse(messagesToSubmit.map(m => m.toJson()) as any, "gpt-4.1", agentSessionState.authToken);
    return response.trim();

}

