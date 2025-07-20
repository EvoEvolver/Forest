import {BaseMessage} from "@forest/node-components/src/chat";
import {NodeM} from "@forest/schema";

class AgentSessionState {
    messages: Map<string, Array<BaseMessage>>
    updateCallback: Map<string, () => void>
    authToken: string | undefined;

    constructor() {
        this.messages = new Map();
        this.updateCallback = new Map();
    }

    addMessage(nodeM: NodeM, message: BaseMessage) {
        if (!this.messages.has(nodeM.id)) {
            this.messages.set(nodeM.id, []);
        }
        this.messages.get(nodeM.id).push(message);
        if (this.updateCallback.has(nodeM.id)) {
            this.updateCallback.get(nodeM.id)();
        }
    }

    clearState() {
        this.messages.clear();
        for (let nodeId of this.updateCallback.keys()) {
            if (this.updateCallback.has(nodeId)) {
                // @ts-ignore
                this.updateCallback.get(nodeId)!();
            }
        }
    }
}

export const agentSessionState = new AgentSessionState()

