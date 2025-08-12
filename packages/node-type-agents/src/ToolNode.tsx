import {NodeM, NodeVM} from "@forest/schema";
import React, {useEffect, useState} from "react";
import * as Y from "yjs";
import CollaborativeEditor from "./CodeEditor";
import CardViewer from "./openapi/CardViewer";
import {json as jsonLang} from '@codemirror/lang-json';
import {httpUrl} from "@forest/schema/src/config"
import {Action, ActionableNodeType, ActionParameter} from "./ActionableNodeType";
import {AgentSessionState} from "./sessionState";
import {ToolCallingMessage, ToolResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";
import {jsonToSpec} from "./openapi/utils";
import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";

const AgentToolOpenApiSpecText = "AgentToolOpenApiSpecText"

export class AgentToolNodeTypeM extends ActionableNodeType {
    static displayName = "Tool"
    static allowReshape = true
    static allowAddingChildren = false
    static allowEditTitle = true

    static getApiSpec(node: NodeM): any {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(AgentToolOpenApiSpecText) as Y.Text;
        if (!yText) {
            return null;
        }
        try {
            const apiSpec = jsonToSpec(yText.toString());
            return apiSpec;
        } catch (e) {
            return null
        }
    }

    static actions(node: NodeM): Action[] {
        const apiSpec = AgentToolNodeTypeM.getApiSpec(node);
        if (!apiSpec || !apiSpec.endpoints || apiSpec.endpoints.length === 0) {
            return [];
        }
        const endpoint = apiSpec.endpoints[0];
        const description = endpoint.description || "No description provided.";

        const parameters: Record<string, ActionParameter> = {};
        if (endpoint.requestBody && endpoint.requestBody.content['application/json']) {
            const schema = endpoint.requestBody.content['application/json'].schema;
            parameters.requestBody = {
                type: schema.type || "object",
                description: schema.description || "Request body parameters"
            };
        }

        return [{
            label: "Call tool " + node.title(),
            description: description,
            parameter: parameters
        }];
    }

    static async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        // Handle other actionable nodes
        const toolCallingMessage = new ToolCallingMessage({
            toolName: node.title(),
            parameters: parameters,
            author: callerNode.title(),
        });
        agentSessionState.addMessage(callerNode, toolCallingMessage);

        const res = await AgentToolNodeTypeM.callApi(node, parameters)

        // Check for URLs starting with https://storage.treer.ai in the response
        const resString = typeof res === 'string' ? res : JSON.stringify(res);
        const urlRegex = /https:\/\/storage\.treer\.ai\/[^\s"]+/g;
        const matches = resString.match(urlRegex);
        if (matches) {
            for (const url of matches) {
                agentSessionState.files.push({
                    fileUrl: url,
                    fileDescription: `File from ${node.title()} tool`
                });
            }
        }
        const toolResponseMessage = new ToolResponseMessage({
            toolName: node.title(),
            response: res,
            author: node.title(),
        })
        agentSessionState.addMessage(callerNode, toolResponseMessage);
    }

    static callApi(node: NodeM, parameters: any) {
        const apiSpec = AgentToolNodeTypeM.getApiSpec(node);
        if (!apiSpec || !apiSpec.endpoints || apiSpec.endpoints.length === 0) {
            throw new Error("No API endpoints available");
        }
        const endpoint = apiSpec.endpoints[0]; // For simplicity, using the first endpoint
        const url = `${apiSpec.servers[0].url}${endpoint.path}`;
        const method = endpoint.method.toUpperCase();

        const proxyRequestBody = {
            requestBody: parameters.requestBody,
            method: method,
            serverAddress: url // Replace with your server address,
        }

        return fetch(httpUrl + "/api/api-proxy/fetch", {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(proxyRequestBody),
        }).then(response => response.json());
    }

    static renderPrompt(node: NodeM): string {
        return "";
    }

    static ydataInitialize(node: NodeM) {
        const ydata = node.ydata()
        if (!ydata.has(AgentToolOpenApiSpecText)) {
            // @ts-ignore
            ydata.set(AgentToolOpenApiSpecText, new Y.Text())
        }
    }
}

export class AgentToolNodeTypeVM extends NodeTypeVM {
    static render(node: NodeVM): React.ReactNode {
        //@ts-ignore
        const yText: Y.Text = node.ydata.get(AgentToolOpenApiSpecText) as Y.Text
        const [apiSpec, setApiSpec] = useState(jsonToSpec(yText.toString()));
        useEffect(() => {
            const observer = () => {
                const apiSpec = jsonToSpec(yText.toString())
                setApiSpec(apiSpec)
            }
            yText.observe(observer)
            return () => {
                yText.unobserve(observer)
            }
        }, []);
        if (!apiSpec) {
            return <div>Loading...</div>
        }
        return <div>
            <CardViewer apiSpec={apiSpec} loading={false} error={null}/>
        </div>
    }

    static renderTool1(node: NodeVM): React.ReactNode {
        return <>
            <h1>OpenAPI spec</h1>
            <CollaborativeEditor yText={node.ydata.get(AgentToolOpenApiSpecText)} langExtension={jsonLang}/>
        </>
    }

    static renderTool2(node: NodeVM): React.ReactNode {
        return <>
        </>
    }
}
