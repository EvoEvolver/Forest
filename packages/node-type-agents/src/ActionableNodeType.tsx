import {NodeM, NodeType} from "@forest/schema";
import {AgentSessionState} from "./sessionState";
import {BaseMessage} from "@forest/agent-chat/src/MessageTypes";

export interface ActionParameter {
    "type": string
    "description": string
}


export abstract class ActionableNodeType extends NodeType {
    abstract actionLabel(node: NodeM): string;
    abstract actionDescription(node: NodeM): string;
    abstract actionParameters(node: NodeM): Record<string, any>;
    abstract executeAction(node: NodeM, parameters: Record<string, ActionParameter>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<BaseMessage>;
}