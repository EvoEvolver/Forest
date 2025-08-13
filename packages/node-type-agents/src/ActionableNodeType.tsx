import {NodeM} from "@forest/schema";
import {AgentSessionState} from "./sessionState";
import {BaseMessage} from "@forest/agent-chat/src/MessageTypes";
import {NodeTypeM} from "@forest/schema/src/nodeTypeM";

export interface ActionParameter {
    "type": string
    "description": string
}

export interface Action {
    label: string
    description: string
    parameter: Record<string, ActionParameter>;
}

export abstract class ActionableNodeType extends NodeTypeM {
    static actions(node: NodeM): Action[] {
        throw new Error('Method not implemented!');
    }
    static executeAction(node: NodeM, label: string, parameters: Record<string, ActionParameter>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<BaseMessage> {
        throw new Error('Method not implemented!');
    }
}