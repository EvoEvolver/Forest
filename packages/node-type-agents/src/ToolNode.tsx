import {NodeM, NodeVM} from "@forest/schema";
import React, {useEffect, useState} from "react";
import * as Y from "yjs";
import CollaborativeEditor from "./CodeEditor";
import CardViewer from "./openapi/CardViewer";
import {json as jsonLang} from '@codemirror/lang-json';
import {parseApiSpec} from "./openapi/apiParser";
import {httpUrl} from "@forest/schema/src/config"
import {Action, ActionableNodeType, ActionParameter} from "./ActionableNodeType";
import {AgentSessionState} from "./sessionState";
import {ToolCallingMessage, ToolResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";

const AgentToolOpenApiSpecText = "AgentToolOpenApiSpecText"

export class AgentToolNodeType extends ActionableNodeType {
    actions(node: NodeM): Action[] {
        const apiSpec = this.getApiSpec(node);
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

    async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        // Handle other actionable nodes
        const toolCallingMessage = new ToolCallingMessage({
            toolName: node.title(),
            parameters: parameters,
            author: callerNode.title(),
        });
        agentSessionState.addMessage(callerNode, toolCallingMessage);

        const res = this.callApi(node, parameters)

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

    displayName = "Tool"
    allowReshape = true
    allowAddingChildren = false
    allowEditTitle = true

    getApiSpec(node: NodeM): any {
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

    render(node: NodeVM): React.ReactNode {
        //@ts-ignore
        const yText: Y.Text = node.ydata.get(AgentToolOpenApiSpecText) as Y.Text
        const [apiSpec, setApiSpec] = useState(jsonToSpec(yText.toString()));
        useEffect(() => {
            const observer = () => {
                const apiSpec = jsonToSpec(yText.toString())
                setApiSpec(apiSpec)
                console.log(this.renderPrompt(node.nodeM))
            }
            yText.observe(observer)
            console.log(this.renderPrompt(node.nodeM))
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


    renderTool1(node: NodeVM): React.ReactNode {
        return <>
            <h1>OpenAPI spec</h1>
            <CollaborativeEditor yText={node.ydata.get(AgentToolOpenApiSpecText)} langExtension={jsonLang}/>
        </>
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
        </>
    }

    renderPrompt(node: NodeM): string {
        const apiSpec = this.getApiSpec(node);
        if (!apiSpec || !apiSpec.endpoints || apiSpec.endpoints.length === 0) {
            return null;
        }
        const endpoint = apiSpec.endpoints[0];
        const title = node.title()
        const description = endpoint.description || "No description provided.";
        const apiParameterPrompt = generatePromptFromSchema(endpoint.requestBody.content['application/json'].schema)
        return `
Title: ${title}
Description: ${description}
Parameters:
${apiParameterPrompt}`
    }

    callApi(node: NodeM, requestBody: any) {
        const apiSpec = this.getApiSpec(node);
        if (!apiSpec || !apiSpec.endpoints || apiSpec.endpoints.length === 0) {
            throw new Error("No API endpoints available");
        }
        const endpoint = apiSpec.endpoints[0]; // For simplicity, using the first endpoint
        const url = `${apiSpec.servers[0].url}${endpoint.path}`;
        const method = endpoint.method.toUpperCase();

        const proxyRequestBody = {
            requestBody: requestBody,
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

    ydataInitialize(node: NodeM) {
        const ydata = node.ydata()
        if (!ydata.has(AgentToolOpenApiSpecText)) {
            // @ts-ignore
            ydata.set(AgentToolOpenApiSpecText, new Y.Text())
        }
    }
}

function jsonToSpec(json: string): any {
    try {
        const parsedJson = JSON.parse(json)
        const dereferencedJson = resolveRefs(parsedJson, parsedJson);
        const apiSpec = parseApiSpec(dereferencedJson);
        return apiSpec
    } catch (e) {
        return null;
    }
}

type JSONObject = { [key: string]: any };

// Parse JSON pointer like "#/components/schemas/addInput"
function resolveJsonPointer(obj: JSONObject, ref: string): any {
    if (!ref.startsWith('#/')) throw new Error(`Unsupported $ref format: ${ref}`);
    const path = ref.slice(2).split('/');
    return path.reduce((acc, key) => {
        if (!(key in acc)) {
            console.error(`ref: ${ref}`);
            console.error(`missing key: ${key}`);
            console.error(`current object keys:`, Object.keys(acc));
            throw new Error(`Invalid $ref path segment: ${key}`);
        }
        return acc[key];
    }, obj);
}


// Recursively resolve all $ref in the JSON
function resolveRefs(obj: JSONObject, root: JSONObject): any {
    if (Array.isArray(obj)) {
        return obj.map(item => resolveRefs(item, root));
    }

    if (typeof obj === 'object' && obj !== null) {
        if ('$ref' in obj && typeof obj['$ref'] === 'string') {
            const resolved = resolveJsonPointer(root, obj['$ref']);
            // Recursively resolve the resolved object too
            return resolveRefs(resolved, root);
        }

        const result: JSONObject = {};
        for (const key of Object.keys(obj)) {
            result[key] = resolveRefs(obj[key], root);
        }
        return result;
    }

    return obj; // primitive value
}

function generatePromptFromSchema(schema: any): string {
    if (schema.type === 'object' && schema.properties) {
        return Object.entries(schema.properties)
            .map(([key, prop]: [string, any]) => {
                const type = prop.type || 'any';
                const desc = prop.description || '';
                return `"${key}" (${type}): ${desc}`;
            })
            .join('\n');
    }
    if (schema.type === 'array' && schema.items) {
        return `[${generatePromptFromSchema(schema.items)}]`;
    }
    const type = schema.type || 'any';
    const desc = schema.description || '';
    return `(${type}): ${desc}`;
}