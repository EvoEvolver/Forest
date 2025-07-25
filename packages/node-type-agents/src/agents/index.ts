import {NodeM} from "@forest/schema";
import {AgentNodeType} from "../AgentNode";
import {AgentCallingMessage, AgentResponseMessage, ToolCallingMessage, ToolResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";
import {agentSessionState} from "../sessionState";
import {AgentToolNodeType} from "../ToolNode";
import {BaseMessage, NormalMessage, SystemMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";

async function getSystemMessage(nodeM: NodeM) {
    const treeM = nodeM.treeM;
    const agentChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentNodeType");
    const toolChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentToolNodeType");
    const nodeTypeName = nodeM.nodeTypeName();
    const agentNodeType = await nodeM.treeM.supportedNodesTypes(nodeTypeName) as AgentNodeType;
    const toolNodeType = await nodeM.treeM.supportedNodesTypes("AgentToolNodeType") as AgentToolNodeType;
    const title = nodeM.title();

    let agentsSection = "";
    if (agentChildren.length > 0) {
        agentsSection = `<agents>
${agentChildren.map(child => child.title()).join('\n')}
</agents>
`;
    }

    let toolsSection = "";
    if (toolChildren.length > 0) {
        toolsSection = `<tools>
${toolChildren.map(child => toolNodeType.renderPrompt(child)).join('\n-------\n')}
</tools>
`;
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
    if (toolChildren.length > 0) {
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
    const toolNodeType = await treeM.supportedNodesTypes("AgentToolNodeType") as AgentToolNodeType;
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
        const toolNodeM = treeM.getChildren(nodeM).find(child => child.nodeTypeName() === "AgentToolNodeType" && child.title() === toolName);
        if (toolNodeM) {
            const toolCallingMessage = new ToolCallingMessage({
                toolName: toolName,
                parameters: input,
                author: nodeM.title(),
            })
            agentSessionState.addMessage(nodeM, toolCallingMessage);
            const res = await toolNodeType.callApi(toolNodeM, input)
            const toolResponseMessage = new ToolResponseMessage({
                toolName: toolName,
                response: res,
                author: toolName,
            })
            agentSessionState.addMessage(nodeM, toolResponseMessage);
        }
    }
    else {
        throw Error(`Unknown response type. Response: ${JSON.stringify(parsedResponse)}`);
    }
}

export async function invokeAgent(nodeM: NodeM, messages: BaseMessage[]) {
    for(let message of messages) {
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