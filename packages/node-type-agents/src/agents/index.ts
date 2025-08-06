import {NodeM} from "@forest/schema";
import {AgentNodeType} from "../AgentNode";
import {MCPNodeType} from "../MCPNode";
import {A2ANodeType} from "../A2ANode";
import {agentSessionState} from "../sessionState";
import {BaseMessage, NormalMessage, SystemMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {ActionableNodeType} from "../ActionableNodeType";

async function getSystemMessage(nodeM: NodeM) {
    const treeM = nodeM.treeM;
    const nodeTypeName = nodeM.nodeTypeName();
    const agentNodeType = await nodeM.treeM.supportedNodesTypes(nodeTypeName) as AgentNodeType;
    const title = nodeM.title();

    let actionsSection = "";
    const resolvedActionableChildren = [];
    for (const child of treeM.getChildren(nodeM)) {
        const nodeType = await treeM.supportedNodesTypes(child.nodeTypeName());
        if (nodeType instanceof ActionableNodeType) {
            resolvedActionableChildren.push({child, nodeType});
        }
    }

    if (resolvedActionableChildren.length > 0) {
        const actionPrompts = [];
        for (const {child, nodeType} of resolvedActionableChildren) {
            const actions = nodeType.actions(child);
            
            // Get context information based on node type
            let childDescription = "";
            if (nodeType instanceof AgentNodeType) {
                const descriptionText = nodeType.agentDescriptionYText(child).toString().trim();
                if (descriptionText) {
                    childDescription = `\nAgent Description: ${descriptionText}`;
                }
            } else if (nodeType instanceof MCPNodeType) {
                const connection = nodeType.getMCPConnection(child);
                if (connection) {
                    let mcpInfo = `\nMCP Node: ${child.title()}`;
                    if (connection.connected) {
                        const serverInfo = connection.serverInfo;
                        const toolCount = connection.tools?.length || 0;
                        mcpInfo += `\nStatus: Connected`;
                        if (serverInfo?.name) {
                            mcpInfo += `\nServer: ${serverInfo.name}`;
                            if (serverInfo.version) {
                                mcpInfo += ` v${serverInfo.version}`;
                            }
                        }
                        mcpInfo += `\nAvailable Tools: ${toolCount}`;
                    } else {
                        mcpInfo += `\nStatus: Disconnected`;
                        if (connection.error) {
                            mcpInfo += `\nError: ${connection.error}`;
                        }
                    }
                    childDescription = mcpInfo;
                }
            } else if (nodeType instanceof A2ANodeType) {
                const connection = nodeType.getA2AConnection(child);
                if (connection) {
                    let a2aInfo = `\nA2A Node: ${child.title()}`;
                    if (connection.connected && connection.agentCard) {
                        const agentCard = connection.agentCard;
                        const skillCount = agentCard.skills?.length || 0;
                        a2aInfo += `\nStatus: Connected`;
                        a2aInfo += `\nAgent: ${agentCard.name}`;
                        if (agentCard.version) {
                            a2aInfo += ` v${agentCard.version}`;
                        }
                        if (agentCard.description) {
                            a2aInfo += `\nAgent Description: ${agentCard.description}`;
                        }
                        a2aInfo += `\nAvailable Skills: ${skillCount}`;
                    } else {
                        a2aInfo += `\nStatus: Disconnected`;
                        if (connection.error) {
                            a2aInfo += `\nError: ${connection.error}`;
                        }
                    }
                    childDescription = a2aInfo;
                }
            }
            
            for (const action of actions) {
                actionPrompts.push(`<action>
Title: ${action.label}
Description: ${action.description}${childDescription}
Parameters: ${JSON.stringify(action.parameter, null, 2)}
</action>
`);
            }
        }

        actionsSection = `<actions>
${actionPrompts.join('')}
</actions>
`;
    }

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
${agentNodeType.agentPromptYText(nodeM).toString()}
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
    const systemMessage = await getSystemMessage(nodeM);
    const messagesWithSystem = [...messages, systemMessage];
    const messagesToSubmit = messagesWithSystem.map(m => m.toJson());
    console.log("messagesToSubmit",messagesToSubmit);
    let response = await fetchChatResponse(messagesToSubmit as any, "gpt-4.1", agentSessionState.authToken);
    console.log("response",response);
    try {
        response = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
    } catch (e) {
        // ignore if no json
    }
    console.log("filtered response",response);

    // Try to parse the response as JSON
    let parsedResponse: any;
    try {
        parsedResponse = JSON.parse(response);
    } catch {
        parsedResponse = {type: "answer_user", message: response, wait_user: true};
    }
    console.log("parsedResponse",parsedResponse);

    if (parsedResponse.type === "answer_user") {
        const messageContent = parsedResponse.message;
        if (messageContent) {
            const responseMessage = new NormalMessage({
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
            const nodeType = await treeM.supportedNodesTypes(child.nodeTypeName());
            if (nodeType instanceof ActionableNodeType) {
                const actions = nodeType.actions(child);
                const matchingAction = actions.find(action => action.label === actionName);
                if (matchingAction) {
                    // Execute the action with the matched label
                    await nodeType.executeAction(child, actionName, parameters, nodeM, agentSessionState);
                    break;
                }
            }
        }
        return ""
    } else {
        throw Error(`Unknown response type. Response: ${JSON.stringify(parsedResponse)}`);
    }
}

export async function invokeAgent(nodeM: NodeM, messages: BaseMessage[]) {
    for (let message of messages) {
        agentSessionState.addMessage(nodeM, message)
    }
    while (true) {
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
    }
}