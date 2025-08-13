import {NodeM} from "@forest/schema";
import * as Y from "yjs";
import {AgentSessionState} from "./sessionState";
import {Action, ActionableNodeType} from "./ActionableNodeType";
import {invokeAgent} from "./agents";
import {AgentCallingMessage, AgentResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";

export const AgentPromptText = "AgentPromptText"
export const AgentDescriptionText = "AgentDescriptionText"
export const TodoMode = "TodoMode"

export class AgentNodeTypeM extends ActionableNodeType {

    static displayName = "Agent"
    static allowReshape = true
    static allowAddingChildren = true
    static allowEditTitle = true

    static allowedChildrenTypes = [
        "AgentNodeType",
        "AgentToolNodeType",
        "CodeInterpreterNodeType",
        "KnowledgeNodeType",
        "MongoDataGridNodeType",
        "A2ANodeType",
        "MCPNodeType",
        "EmbeddedNodeType"
    ]

    static ydataInitialize(node: NodeM) {
        const ydata = node.ydata()
        if (!ydata.has(AgentPromptText)) {
            // @ts-ignore
            ydata.set(AgentPromptText, new Y.Text())
        }
        if (!ydata.has(AgentDescriptionText)) {
            // @ts-ignore
            ydata.set(AgentDescriptionText, new Y.Text())
        }
        if (!ydata.has(TodoMode)) {
            // @ts-ignore
            ydata.set(TodoMode, new Y.Map())
        }
    }

    static agentPromptYText(node: NodeM): Y.Text {
        // @ts-ignore
        return node.ydata().get(AgentPromptText) as Y.Text
    }

    static agentDescriptionYText(node: NodeM): Y.Text {
        // @ts-ignore
        return node.ydata().get(AgentDescriptionText) as Y.Text
    }

    static todoModeSwith(node: NodeM): boolean {
        return node.ydata().get(TodoMode)?.get('enabled') || false;
    }

    static actions(node: NodeM): Action[] {
        return [{
            label: "Ask agent " + node.title(),
            description: AgentNodeTypeM.agentDescriptionYText(node).toJSON(),
            parameter: {
                "query": {
                    "type": "string",
                    "description": "The question or command to ask the agent."
                }
            }
        }];
    }

    static renderPrompt(node: NodeM): string {
        return AgentNodeTypeM.agentDescriptionYText(node).toJSON()
    }

    static async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const agentCallingMessage = new AgentCallingMessage({
            author: callerNode.title(),
            agentName: node.title(),
            message: parameters.query,
        });
        agentSessionState.addMessage(callerNode, agentCallingMessage);

        const messageToAgent = new NormalMessage({
            content: parameters.query,
            author: callerNode.title(),
            role: "user",
        })

        const agentReply = await invokeAgent(node, [messageToAgent])

        const agentResponseMessage = new AgentResponseMessage({
            author: node.title(),
            result: agentReply,
            agentName: node.title(),
        });
        agentSessionState.addMessage(callerNode, agentResponseMessage);
    }
}