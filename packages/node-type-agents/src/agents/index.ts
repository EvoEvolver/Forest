import {NodeM} from "@forest/schema";
import {AgentNodeType} from "../AgentNode";
import {BaseMessage, NormalMessage, SystemMessage} from "@forest/node-components/src/chat";
import {fetchChatResponse} from "../llm";
import {AgentCallingMessage, AgentResponseMessage} from "../Message";
import {agentSessionState} from "../sessionState";
import {AgentToolNodeType} from "../ToolNode";

async function getSystemMessage(nodeM: NodeM) {
    const treeM = nodeM.treeM;
    const agentChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentNodeType");
    const toolChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentToolNodeType");
    const nodeTypeName = nodeM.nodeTypeName()
    const agentNodeType = await nodeM.treeM.supportedNodesTypes(nodeTypeName) as AgentNodeType;
    const toolNodeType = await nodeM.treeM.supportedNodesTypes("AgentToolNodeType") as AgentToolNodeType
    const title = nodeM.title();

    const systemMessage = new SystemMessage(`
You are required to act as a smart AI agent.
Your title as an agent is: ${title}
Your context is the following:
<context>
${agentNodeType.agentPromptYText(nodeM).toString()}
</context>
You can get help from the following agents:
<agents>
${agentChildren.map(child => child.title()).join('\n')}
</agents>
<tools>
${toolChildren.map(child => toolNodeType.renderPrompt(child)).join('\n-------\n')}
</tools>
You are required to response to the request from the user.
Your response must adopt one of the following JSON formats
You must only output JSON
<agent_calling>
{
 "type": "agent_calling",
 "agent_name": agent name in string,
 "message": the message to the agent
}
</agent_calling>
<tool_calling>
{
 "type": "tool_calling",
 "tool_name": tool name in string,
 "input": the input to the tool,
}
</tool_calling>
<user_response>
{
 "type": "user_response",
 "message": the message to the user,
 "finish": true or false, make it true if you do not need to take any further actions
}
</user_response>
`);
    return systemMessage;
}


async function getNextStep(nodeM: NodeM): Promise<string | undefined> {
    const treeM = nodeM.treeM;
    const messages = agentSessionState.messages.get(nodeM.id) || [];
    const agentChildren = treeM.getChildren(nodeM).filter((n) => n.nodeTypeName() === "AgentNodeType");
    const toolNodeType = await treeM.supportedNodesTypes("AgentToolNodeType") as AgentToolNodeType;
    const systemMessage = await getSystemMessage(nodeM);
    const messagesWithSystem = [systemMessage, ...messages];
    const messagesToSubmit = messagesWithSystem.map(m => m.toJson());
    console.log(messagesToSubmit)
    let response = await fetchChatResponse(messagesToSubmit as any, "o4-mini", agentSessionState.authToken);
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
        parsedResponse = {type: "user_response", message: response, wait_user: true};
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
    } else if (parsedResponse.type === "user_response") {
        const messageContent = parsedResponse.message;
        const waitUser = parsedResponse.finish ?? true;

        if (messageContent) {
            const responseMessage = new NormalMessage({
                content: messageContent,
                author: "Chatbot",
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
            const toolCallingMessage = new AgentCallingMessage({
                agentName: toolName,
                message: JSON.stringify(input),
                author: nodeM.title(),
            })
            agentSessionState.addMessage(nodeM, toolCallingMessage);
            const res = await toolNodeType.callApi(toolNodeM, input)
            const toolResponseMessage = new AgentResponseMessage({
                agentName: toolName,
                result: JSON.stringify(res),
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