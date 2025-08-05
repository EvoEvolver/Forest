import {NodeM, NodeType} from "@forest/schema";
import {AgentSessionState} from "./sessionState";
import {BaseMessage} from "@forest/agent-chat/src/MessageTypes";

export interface ActionParameter {
    "type": string
    "description": string
}

export interface Action {
    label: string
    description: string
    parameter: Record<string, ActionParameter>;
}

export abstract class ActionableNodeType extends NodeType {
    abstract actions(node: NodeM): Action[];
    abstract executeAction(node: NodeM, label: string, parameters: Record<string, ActionParameter>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<BaseMessage>;
}