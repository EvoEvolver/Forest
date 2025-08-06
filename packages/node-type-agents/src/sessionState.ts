import {BaseMessage} from "@forest/agent-chat/src/MessageTypes";
import {NodeM} from "@forest/schema";


class AgentFile {
    fileUrl: string;
    fileDescription: string;
}

export class AgentSessionState {
    messages: Map<string, Array<BaseMessage>>
    todos: Map<string, string>
    updateCallback: Map<string, () => void>
    authToken: string | undefined;
    files: AgentFile[];
    stopFlag: boolean = false

    constructor() {
        this.messages = new Map();
        this.todos = new Map();
        this.updateCallback = new Map();
        this.files = [];
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

    setTodos(nodeM: NodeM, todos: string) {
        this.todos.set(nodeM.id, todos);
        if (this.updateCallback.has(nodeM.id)) {
            this.updateCallback.get(nodeM.id)();
        }
    }

    clearState() {
        this.messages.clear();
        this.stopFlag = true
        for (let nodeId of this.updateCallback.keys()) {
            if (this.updateCallback.has(nodeId)) {
                // @ts-ignore
                this.updateCallback.get(nodeId)!();
            }
        }
    }
}

export const agentSessionState = new AgentSessionState()

