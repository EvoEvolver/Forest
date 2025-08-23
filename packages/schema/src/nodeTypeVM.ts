import {NodeVM} from "./viewModel";

export abstract class NodeTypeVM {

    static oneTool: boolean = false;

    static render(node: NodeVM): React.ReactNode {
        return null
    }

    static renderTool(node: NodeVM): React.ReactNode {
        return null
    }

    static renderTool1(node: NodeVM): React.ReactNode {
        return null
    }

    static renderTool2(node: NodeVM): React.ReactNode {
        return null
    }
}