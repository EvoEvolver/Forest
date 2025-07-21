import { NodeM } from "./model"
import {NodeVM} from "./viewModel";


export abstract class NodeType {
    displayName: string

    allowAddingChildren: boolean = false

    allowReshape: boolean = false

    allowEditTitle: boolean = false

    allowedChildrenTypes: string[] = []

    abstract render(node: NodeVM): React.ReactNode

    abstract renderTool1(node: NodeVM): React.ReactNode

    abstract renderTool2(node: NodeVM): React.ReactNode

    abstract renderPrompt(node: NodeM): string

    ydataInitialize(node: NodeM): void {
    }

    vdataInitialize(node: NodeVM): void {
    }
}