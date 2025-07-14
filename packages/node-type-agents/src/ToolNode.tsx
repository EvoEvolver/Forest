import {NodeM, NodeType, NodeVM} from "@forest/schema";
import React, {useEffect, useState} from "react";
import * as Y from "yjs";
import CollaborativeEditor from "./CodeEditor";
import CardViewer from "./openapi/CardViewer";
import { yaml } from '@codemirror/lang-yaml';

const AgentToolOpenApiSpecText = "AgentToolOpenApiSpecText"
export class AgentToolNodeType extends NodeType {
    displayName = "Tool"
    allowReshape = true
    allowAddingChildren = false
    allowEditTitle = true

    render(node: NodeVM): React.ReactNode {
        //@ts-ignore
        const yText: Y.Text = node.ydata.get(AgentToolOpenApiSpecText) as Y.Text
        const [yamlData, setYamlData] = useState(yText.toString())
        useEffect(() => {
            const observer = ()=>{
                setYamlData(yText.toString())
            }
            yText.observe(observer)
            return () => {
                yText.unobserve(observer)
            }
        }, []);
        return <div>
            <CardViewer yaml={yamlData}/>
        </div>
    }


    renderTool1(node: NodeVM): React.ReactNode {
        return <>
            <h1>OpenAPI spec</h1>
            <CollaborativeEditor yText={node.ydata.get(AgentToolOpenApiSpecText)} langExtension={yaml}/>
        </>
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
        </>
    }

    renderPrompt(node: NodeM): string {
        return ""
    }

    ydataInitialize(node: NodeVM) {
        const ydata = node.ydata
        if(!ydata.has(AgentToolOpenApiSpecText)){
            // @ts-ignore
            ydata.set(AgentToolOpenApiSpecText, new Y.Text())
        }
    }
}