import {NodeM} from "@forest/schema";
import {AgentNodeType} from "../AgentNode";
import {
    AgentCallingMessage,
    AgentResponseMessage,
    ToolCallingMessage,
    ToolResponseMessage
} from "@forest/agent-chat/src/AgentMessageTypes";
import {agentSessionState} from "../sessionState";
import {AgentToolNodeType} from "../ToolNode";
import {MCPNodeType} from "../MCPNode";
import {BaseMessage, NormalMessage, SystemMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {KnowledgeNodeType} from "../KnowledgeNode";

async function getSystemMessage(nodeM: NodeM) {
    const treeM = nodeM.treeM;
    const agentChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentNodeType");
    const toolChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentToolNodeType");
    const mcpChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "MCPNodeType");
    const knowledgeChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "KnowledgeNodeType");
    const nodeTypeName = nodeM.nodeTypeName();
    const agentNodeType = await nodeM.treeM.supportedNodesTypes(nodeTypeName) as AgentNodeType;
    const toolNodeType = await nodeM.treeM.supportedNodesTypes("AgentToolNodeType") as AgentToolNodeType;
    const mcpNodeType = await nodeM.treeM.supportedNodesTypes("MCPNodeType") as MCPNodeType;
    const knowledgeNodeType = await nodeM.treeM.supportedNodesTypes("KnowledgeNodeType");
    const title = nodeM.title();

    let agentsSection = "";
    if (agentChildren.length > 0) {
        agentsSection = `<agents>
${agentChildren.map(child => child.title()).join('\n')}
</agents>
`;
    }

    let toolsSection = "";
    if (toolChildren.length > 0 || mcpChildren.length > 0 || knowledgeChildren.length > 0) {
        const allToolPrompts = [
            ...toolChildren.map(child => toolNodeType.renderPrompt(child)),
            ...mcpChildren.map(child => mcpNodeType.renderPrompt(child)),
            ...knowledgeChildren.map(child => knowledgeNodeType.renderPrompt(child))
        ].filter(prompt => prompt && prompt.trim()); // Filter out empty prompts
        
        if (allToolPrompts.length > 0) {
            toolsSection = `<tools>
${allToolPrompts.join('\n-------\n')}
</tools>
`;
        }
    }

    let formatsSection = "";
    if (agentChildren.length > 0) {
        formatsSection += `<agent_calling>
{
 "type": "agent_calling",
 "agent_name": agent name in string,
 "message": the message to the agent
}
</agent_calling>
`;
    }
    if (toolChildren.length > 0 || mcpChildren.length > 0) {
        formatsSection += `<tool_calling>
{
 "type": "tool_calling",
 "tool_name": tool name in string,
 "input": the input to the tool,
}
</tool_calling>
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
${agentsSection}${toolsSection}
You are required to solve the problem and answer the user by reply a message with the type "answer_user".
Your response must adopt one of the following JSON formats
You must only output JSON
${formatsSection}`);
    return systemMessage;
}


async function getNextStep(nodeM: NodeM): Promise<string | undefined> {
    const treeM = nodeM.treeM;
    const messages = agentSessionState.messages.get(nodeM.id) || [];
    const agentChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentNodeType");
    const toolChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentToolNodeType");
    const mcpChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "MCPNodeType");
    const toolNodeType = await treeM.supportedNodesTypes("AgentToolNodeType") as AgentToolNodeType;
    const mcpNodeType = await treeM.supportedNodesTypes("MCPNodeType") as MCPNodeType;
    const systemMessage = await getSystemMessage(nodeM);
    const messagesWithSystem = [...messages, systemMessage];
    const messagesToSubmit = messagesWithSystem.map(m => m.toJson());
    console.log(messagesToSubmit)
    let response = await fetchChatResponse(messagesToSubmit as any, "gpt-4.1", agentSessionState.authToken);
    console.log(response)
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

    if (parsedResponse.type === "agent_calling") {
        const agentName = parsedResponse.agent_name;
        const agentMessage = parsedResponse.message;
        // Find the child agent node by title
        const targetAgentNodeM = agentChildren.find(child => child.title() === agentName);
        if (targetAgentNodeM) {
            const agentCallingMessage = new AgentCallingMessage({
                author: nodeM.title(),
                agentName: agentName,
                message: agentMessage,
            });
            agentSessionState.addMessage(nodeM, agentCallingMessage);
            const agentQueryMessage = new NormalMessage({
                content: agentMessage,
                author: nodeM.title(),
                role: "user",
                time: new Date().toISOString(),
            })
            const agentReply = await invokeAgent(targetAgentNodeM, [agentQueryMessage]);

            const agentResponseMessage = new AgentResponseMessage({
                author: targetAgentNodeM.title(),
                agentName: agentName,
                result: agentReply,
            });
            agentSessionState.addMessage(nodeM, agentResponseMessage);

        } else {
            throw Error(`Agent ${agentName} not found`);
        }
    } else if (parsedResponse.type === "answer_user") {
        const messageContent = parsedResponse.message;
        if (messageContent) {
            const responseMessage = new NormalMessage({
                content: messageContent,
                author: nodeM.title(),
                role: "assistant",
                time: new Date().toISOString(),
            });
            agentSessionState.addMessage(nodeM, responseMessage);
        }

        return messageContent;
    } else if (parsedResponse.type === "tool_calling") {
        const toolName = parsedResponse.tool_name;
        const input = parsedResponse.input;
        
        // First try to find OpenAPI tool
        const toolNodeM = toolChildren.find(child => child.title() === toolName);
        
        // Then try to find MCP tool
        let mcpNodeM = null;
        if (!toolNodeM) {
            for (const mcpChild of mcpChildren) {
                const connection = mcpNodeType.getMCPConnection(mcpChild);
                if (connection && connection.connected && connection.tools.some(tool => tool.name === toolName)) {
                    mcpNodeM = mcpChild;
                    break;
                }
            }
        }
        
        if (toolNodeM) {
            // Handle OpenAPI tool
            const toolCallingMessage = new ToolCallingMessage({
                toolName: toolName,
                parameters: input,
                author: nodeM.title(),
            })
            agentSessionState.addMessage(nodeM, toolCallingMessage);
            const res = await toolNodeType.callApi(toolNodeM, input)

            // Check for URLs starting with https://storage.treer.ai in the response
            const resString = typeof res === 'string' ? res : JSON.stringify(res);
            const urlRegex = /https:\/\/storage\.treer\.ai\/[^\s"]+/g;
            const matches = resString.match(urlRegex);
            if (matches) {
                for (const url of matches) {
                    agentSessionState.files.push({
                        fileUrl: url,
                        fileDescription: `File from ${toolName} tool`
                    });
                }
            }

            const toolResponseMessage = new ToolResponseMessage({
                toolName: toolName,
                response: res,
                author: toolName,
            })
            agentSessionState.addMessage(nodeM, toolResponseMessage);
        } else if (mcpNodeM) {
            // Handle MCP tool
            const toolCallingMessage = new ToolCallingMessage({
                toolName: toolName,
                parameters: input,
                author: nodeM.title(),
            })
            agentSessionState.addMessage(nodeM, toolCallingMessage);
            
            const res = await mcpNodeType.callMCPTool(mcpNodeM, toolName, input);

            // Check for URLs starting with https://storage.treer.ai in the response
            const resString = typeof res === 'string' ? res : JSON.stringify(res);
            const urlRegex = /https:\/\/storage\.treer\.ai\/[^\s"]+/g;
            const matches = resString.match(urlRegex);
            if (matches) {
                for (const url of matches) {
                    agentSessionState.files.push({
                        fileUrl: url,
                        fileDescription: `File from MCP ${toolName} tool`
                    });
                }
            }

            const toolResponseMessage = new ToolResponseMessage({
                toolName: toolName,
                response: res,
                author: toolName,
            })
            agentSessionState.addMessage(nodeM, toolResponseMessage);
        } else if(toolName.startsWith("Search from knowledge source ")) {
            const knowledgeNodeM = treeM.getChildren(nodeM).find(child => child.nodeTypeName() === "KnowledgeNodeType" && child.title() === toolName.replace("Search from knowledge source ", ""));
            if (knowledgeNodeM) {
                const toolCallingMessage = new ToolCallingMessage({
                    toolName: toolName,
                    parameters: input,
                    author: nodeM.title(),
                })
                agentSessionState.addMessage(nodeM, toolCallingMessage);
                const res = await KnowledgeNodeType.search(knowledgeNodeM, input);
                const toolResponseMessage = new ToolResponseMessage({
                    toolName: toolName,
                    response: res,
                    author: toolName,
                })
                agentSessionState.addMessage(nodeM, toolResponseMessage);
            }
        }
    } else {
        throw Error(`Unknown response type. Response: ${JSON.stringify(parsedResponse)}`);
    }
}

export async function invokeAgent(nodeM: NodeM, messages: BaseMessage[]) {
    for (let message of messages) {
        agentSessionState.addMessage(nodeM, message)
    }
    while (true) {
        let messageContent;
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