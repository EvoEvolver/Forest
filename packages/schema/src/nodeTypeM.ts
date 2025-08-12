import {NodeM} from "./model"


export abstract class NodeTypeM {
    static displayName: string

    static allowAddingChildren: boolean = false

    static allowReshape: boolean = false

    static allowEditTitle: boolean = false

    static allowedChildrenTypes: string[] = []

    static renderPrompt(node: NodeM): string {
        return "";
    }

    static ydataInitialize(node: NodeM): void {
    }
}