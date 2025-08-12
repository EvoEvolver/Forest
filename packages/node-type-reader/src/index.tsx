import React from "react";
import {NodeM, NodeVM} from "@forest/schema"
import TurndownService from 'turndown'
import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";
import {NodeTypeM} from "@forest/schema/src/nodeTypeM";

interface ReaderNodeData {
    htmlContent: string,
    htmlOriginalContent: string,
}

export class ReaderNodeTypeVM extends NodeTypeVM {
    render(node: NodeVM): React.ReactNode {
        const data: ReaderNodeData = node.data
        const htmlContent = data.htmlContent
        return <>
            <span dangerouslySetInnerHTML={{__html: htmlContent}}/>
        </>
    }

    renderTool1(node: NodeVM): React.ReactNode {
        return <>
        </>
    }

    renderTool2(node: NodeVM): React.ReactNode {
        const data: ReaderNodeData = node.data
        const htmlOriginalContent = data.htmlOriginalContent
        if (!htmlOriginalContent) {
            return null
        }
        return <>
            <span dangerouslySetInnerHTML={{__html: htmlOriginalContent}}/>
        </>
    }
}

export class ReaderNodeTypeM extends NodeTypeM {
    renderPrompt(node: NodeM): string {
        const data: ReaderNodeData = node.data()
        const htmlContent = data.htmlContent
        //const htmlOriginalContent = data.htmlOriginalContent
        const turndownService = new TurndownService()
        return turndownService.turndown(htmlContent)
    }
}