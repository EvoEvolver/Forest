import {NodeM} from "@forest/schema";
import {agentSessionState} from "../sessionState";
import {BaseMessage, MarkdownMessage, SystemMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {Action, ActionableNodeType} from "../ActionableNodeType";
import {decomposeTask, updateTodoListAfterTask} from "./todoManager";
import {getConnectableNodes} from "../utils/nodeTypeUtils";
import {AgentNodeTypeM} from "../AgentNode";
import {NodeTypeM} from "@forest/schema/src/nodeTypeM";
import { MCPNodeTypeM } from "../MCPNode";
import {A2ANodeTypeM} from "../A2ANode";

export async function generateActionListPrompt(node: NodeM, extraActions): Promise<string> {
    const treeM = node.treeM;
    const resolvedActionableChildren = [];
    for (const child of treeM.getChildren(node)) {
        const nodeType = treeM.supportedNodeTypesM(child.nodeTypeName());
        if (nodeType.prototype instanceof ActionableNodeType) {
            resolvedActionableChildren.push({child, nodeType});
        }
    }
    if (resolvedActionableChildren.length === 0) {
        return "";
    }
    const actionToPrompt = (a: Action) => `<action>
Title: ${a.label}
Description: ${a.description.trim()}
Parameters: ${JSON.stringify(a.parameter, null, 2)}
</action>
`
    const actionPrompts = [];
    for (const {child, nodeType} of resolvedActionableChildren) {
        const actions = nodeType.actions(child);
        for (const action of actions) {
            actionPrompts.push(actionToPrompt(action));
        }
    }
    for (const action of extraActions) {
        actionPrompts.push(actionToPrompt(action));
    }
    return `<actions>
${actionPrompts.join('')}
</actions>
`;
}

async function getSystemMessage(nodeM: NodeM, extraActions: Action[] = []) {
    const treeM = nodeM.treeM;
    const nodeTypeName = nodeM.nodeTypeName();
    const title = nodeM.title();

    const resolvedActionableChildren = [];
    for (const child of treeM.getChildren(nodeM)) {
        const nodeType = treeM.supportedNodeTypesM(child.nodeTypeName());
        if (nodeType.prototype instanceof ActionableNodeType) {
            resolvedActionableChildren.push({child, nodeType});
        }
    }

    const actionsSection = await generateActionListPrompt(nodeM, extraActions);
    let formatsSection = "";
    if (resolvedActionableChildren.length > 0) {
        formatsSection += `<action_calling>
{
 "type": "action_calling",
 "action_title": the exact action title in string,
 "parameters": the parameters to the action,
}
</action_calling>
`;
    }
    formatsSection += `<answer_user>
{
 "type": "answer_user",
 "message": the message to the user
}
</answer_user>
`;

    const systemMessage = new SystemMessage(`
You are required to act as a smart AI agent.
Your title as an agent is: ${title}
Your context is the following:
<context>
${AgentNodeTypeM.agentPromptYText(nodeM).toString()}
</context>
${actionsSection}
You are required to solve the problem and answer the user by reply a message with the type "answer_user".
Your response must adopt one of the following JSON formats
You must only output JSON
${formatsSection}`);
    return systemMessage;
}


async function getNextStep(nodeM: NodeM): Promise<string | undefined> {
    const treeM = nodeM.treeM;
    const messages = agentSessionState.messages.get(nodeM.id) || [];

    let extraAction: Action[] = []

    const systemMessage = await getSystemMessage(nodeM, extraAction);
    const messagesWithSystem = [...messages, systemMessage];
    const messagesToSubmit = messagesWithSystem.map(m => m.toJson());
    console.log("messagesToSubmit", messagesToSubmit);
    let response = await fetchChatResponse(messagesToSubmit as any, "gpt-4.1", agentSessionState.authToken);
    console.log("response", response);
    try {
        response = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
    } catch (e) {
        // ignore if no json
    }

    // Try to parse the response as JSON
    let parsedResponse: any;
    try {
        parsedResponse = JSON.parse(response);
    } catch {
        parsedResponse = {type: "answer_user", message: response, wait_user: true};
    }
    console.log("parsedResponse", parsedResponse);

    if (parsedResponse.type === "answer_user") {
        const messageContent = parsedResponse.message;
        if (messageContent) {
            const responseMessage = new MarkdownMessage({
                content: messageContent,
                author: nodeM.title(),
                role: "assistant"
            });
            agentSessionState.addMessage(nodeM, responseMessage);
        }
        return messageContent;
    } else if (parsedResponse.type === "action_calling") {
        const actionName = parsedResponse.action_title;
        const parameters = parsedResponse.parameters;
        // Find the child node that matches this action
        for (const child of treeM.getChildren(nodeM)) {
            const nodeType: typeof NodeTypeM = treeM.supportedNodeTypesM(child.nodeTypeName());
            if (nodeType.prototype instanceof ActionableNodeType) {
                const actionNodeType: typeof ActionableNodeType = nodeType as typeof ActionableNodeType;
                const actions = actionNodeType.actions(child);
                const matchingAction = actions.find(action => action.label === actionName);
                if (matchingAction) {
                    // Execute the action with the matched label
                    console.log(`[MCP Debug] Executing action: ${actionName} on ${child.nodeTypeName()}`);
                    console.log(`[MCP Debug] Parameters:`, parameters);

                    const result = await actionNodeType.executeAction(child, actionName, parameters, nodeM, agentSessionState);
                    console.log(`[MCP Debug] Action execution result:`, result);

                    if (AgentNodeTypeM.todoModeSwith(nodeM)) {
                        const newTodos = await updateTodoListAfterTask(agentSessionState.todos.get(nodeM.id), messages)
                        console.log("newTodos", newTodos);
                        agentSessionState.setTodos(nodeM, newTodos)
                        agentSessionState.addMessage(nodeM, new MarkdownMessage({
                            role: "assistant",
                            content: newTodos,
                            author: nodeM.title()
                        }))
                    }

                    return ""
                }
            }
        }
        throw Error(`Unknown action title. LLM output: ${JSON.stringify(parsedResponse)}`);
    } else {
        throw Error(`Unknown response type. LLM output: ${JSON.stringify(parsedResponse)}`);
    }
}

// Auto-connect MCP and A2A nodes in the agent's subtree
async function autoConnectSubtreeNodes(agentNode: NodeM): Promise<void> {
    try {
        const treeM = agentNode.treeM;

        // Get all descendant nodes of the agent
        const descendantNodes = treeM.getAllDescendantNodes(agentNode);
        console.log(`🔌 [Auto-Connect] Found ${descendantNodes.length} descendant nodes for agent ${agentNode.title()}`);

        // Filter to get only MCP and A2A nodes
        const {mcpNodes, a2aNodes} = getConnectableNodes(descendantNodes);
        console.log(`🔌 [Auto-Connect] Found ${mcpNodes.length} MCP nodes and ${a2aNodes.length} A2A nodes`);

        // Auto-connect MCP nodes
        if (mcpNodes.length > 0) {
            const mcpPromises = mcpNodes.map(async (mcpNode) => {
                try {
                    await MCPNodeTypeM.attemptAutoConnect(mcpNode);
                } catch (error) {
                    console.error(`🔌 [Auto-Connect] Failed to auto-connect MCP node ${mcpNode.title()}:`, error);
                }
            });
            await Promise.all(mcpPromises);
        }

        // Auto-connect A2A nodes
        if (a2aNodes.length > 0) {
            const a2aPromises = a2aNodes.map(async (a2aNode) => {
                try {
                    await A2ANodeTypeM.attemptAutoConnect(a2aNode);
                } catch (error) {
                    console.error(`🔌 [Auto-Connect] Failed to auto-connect A2A node ${a2aNode.title()}:`, error);
                }
            });
            await Promise.all(a2aPromises);
        }

        console.log(`🔌 [Auto-Connect] Completed auto-connection for agent ${agentNode.title()}`);
    } catch (error) {
        console.error(`🔌 [Auto-Connect] Error during auto-connection for agent ${agentNode.title()}:`, error);
    }
}

export async function invokeAgent(nodeM: NodeM, messages: BaseMessage[]) {
    for (let message of messages) {
        agentSessionState.addMessage(nodeM, message)
    }

    // Auto-connect MCP and A2A nodes in the subtree before processing the agent
    await autoConnectSubtreeNodes(nodeM);

    if (messages.length > 0 && AgentNodeTypeM.todoModeSwith(nodeM)) {
        const initialMessage = messages.map(m => m.toJson()["content"]).join("\n")
        const todoList = await decomposeTask(initialMessage, nodeM);
        console.log("todoList", todoList);
        agentSessionState.setTodos(nodeM, todoList);
        agentSessionState.addMessage(nodeM, new MarkdownMessage({
            role: "assistant",
            content: `
${todoList} `,
            author: nodeM.title()
        }))
    }
    const maxIter = 50
    for (let i = 0; i < maxIter; i++) {
        let messageContent: string | undefined;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                messageContent = await getNextStep(nodeM);
                break; // Success, exit loop
            } catch (error) {
                console.error("Retrying. Error invoking agent:", error);
                if (attempt === 2) throw error; // Rethrow after 3rd failure
            }
        }
        if (messageContent) {
            return messageContent;
        }
        if (agentSessionState.stopFlag) {
            return messageContent
        }
    }
    return "Maximum iterations reached without a response.";
}