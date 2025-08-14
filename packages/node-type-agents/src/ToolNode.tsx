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
import {ApiDocImportButton} from './CodeButtons/ApiDocImportButton';
import {BearerTokenManageButton} from './CodeButtons/BearerTokenManageButton';
import {jsonToSpec} from "./openapi/utils";
import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";

const AgentToolOpenApiSpecText = "AgentToolOpenApiSpecText"
const AgentToolBearerToken = "AgentToolBearerToken"

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
        if (!endpoint) {
            console.warn(`[ToolNode] No endpoint found for node: ${node.title()}`);
            return [];
        }

        const description = endpoint.description || "No description provided.";
        const parameters: Record<string, ActionParameter> = {};

        try {
            // Extract query, path, and header parameters (skip cookie parameters for now)
            if (endpoint.parameters && endpoint.parameters.length > 0) {
                endpoint.parameters.forEach((param: any) => {
                    // Skip cookie parameters for now
                    if (param.in === 'cookie') {
                        return;
                    }

                    // Create rich parameter description with context
                    let description = param.description || `${param.in} parameter: ${param.name}`;

                    // Add examples if available
                    if (param.example) {
                        description += ` (e.g., "${param.example}")`;
                    }

                    // Add schema examples if available
                    if (param.schema && param.schema.example) {
                        description += ` (e.g., "${param.schema.example}")`;
                    }

                    // Add constraints if available
                    if (param.schema) {
                        if (param.schema.minimum !== undefined && param.schema.maximum !== undefined) {
                            description += ` (range: ${param.schema.minimum}-${param.schema.maximum})`;
                        }
                        if (param.schema.enum) {
                            description += ` (options: ${param.schema.enum.join(', ')})`;
                        }
                        if (param.schema.pattern) {
                            description += ` (format: ${param.schema.pattern})`;
                        }
                    }

                    // Add required indicator
                    if (param.required) {
                        description += " [REQUIRED]";
                    }

                    parameters[param.name] = {
                        type: param.schema?.type || param.type || "string",
                        description: description,
                        required: param.required || false
                    };
                });
            }

            // Extract request body parameters (keep existing functionality for backward compatibility)
            if (endpoint.requestBody && endpoint.requestBody.content['application/json']) {
                const schema = endpoint.requestBody.content['application/json'].schema;

                // If request body schema has properties, extract them individually
                if (schema.type === 'object' && schema.properties) {
                    Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
                        let description = propSchema.description || `Request body property: ${propName}`;

                        // Add examples and constraints for request body properties
                        if (propSchema.example) {
                            description += ` (e.g., "${propSchema.example}")`;
                        }
                        if (propSchema.enum) {
                            description += ` (options: ${propSchema.enum.join(', ')})`;
                        }

                        // Check if property is required
                        const isRequired = schema.required && schema.required.includes(propName);
                        if (isRequired) {
                            description += " [REQUIRED]";
                        }

                        parameters[propName] = {
                            type: propSchema.type || "string",
                            description: description,
                            required: isRequired || false
                        };
                    });
                } else {
                    // Fallback to single requestBody parameter for non-object schemas
                    parameters.requestBody = {
                        type: schema.type || "object",
                        description: schema.description || "Request body parameters",
                        required: false
                    };
                }
            }
        } catch (error) {
            console.error(`[ToolNode] Error extracting parameters for node: ${node.title()}`, error);
            // Fallback to basic functionality if parameter extraction fails
            if (endpoint.requestBody && endpoint.requestBody.content['application/json']) {
                const schema = endpoint.requestBody.content['application/json'].schema;
                parameters.requestBody = {
                    type: schema.type || "object",
                    description: schema.description || "Request body parameters",
                    required: false
                };
            }
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

    static getBearerToken(node: NodeM): string | undefined {
        const yText: Y.Text = node.ydata().get(AgentToolBearerToken) as Y.Text;
        if (!yText) return undefined;
        const token = yText.toString().trim();
        return token.length > 0 ? token : undefined;
    }

    static getApiSpecYText(node: NodeM): Y.Text {
        return node.ydata().get(AgentToolOpenApiSpecText) as Y.Text;
    }

    static updateApiSpec(node: NodeM, apiSpec: string): void {
        const yText = AgentToolNodeTypeM.getApiSpecYText(node);
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, apiSpec);
        }
    }

    static getBearerTokenYText(node: NodeM): Y.Text {
        return node.ydata().get(AgentToolBearerToken) as Y.Text;
    }

    static updateBearerToken(node: NodeM, token: string): void {
        const yText = AgentToolNodeTypeM.getBearerTokenYText(node);
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, token);
        } else {
            // Create the Y.Text if it doesn't exist
            const newTokenYText = new Y.Text();
            newTokenYText.insert(0, token);
            node.ydata().set(AgentToolBearerToken, newTokenYText);
        }
    }

    static clearBearerToken(node: NodeM): void {
        const yText = AgentToolNodeTypeM.getBearerTokenYText(node);
        if (yText) {
            yText.delete(0, yText.length);
        }
    }


    static callApi(node: NodeM, parameters: any) {
        const apiSpec = AgentToolNodeTypeM.getApiSpec(node);
        if (!apiSpec || !apiSpec.endpoints || apiSpec.endpoints.length === 0) {
            throw new Error("No API endpoints available");
        }
        const endpoint = apiSpec.endpoints[0]; // For simplicity, using the first endpoint
        let url = `${apiSpec.servers[0].url}${endpoint.path}`;
        const method = endpoint.method.toUpperCase();

        // Get bearer token
        const bearerToken = AgentToolNodeTypeM.getBearerToken(node);

        // Separate parameters by type
        const queryParams: Record<string, string> = {};
        const pathParams: Record<string, string> = {};
        const headerParams: Record<string, string> = {};
        let requestBody: any = {};

        // Categorize parameters based on the endpoint definition
        if (endpoint.parameters && endpoint.parameters.length > 0) {
            endpoint.parameters.forEach((param: any) => {
                const paramValue = parameters[param.name];
                if (paramValue !== undefined && paramValue !== null) {
                    switch (param.in) {
                        case 'query':
                            queryParams[param.name] = String(paramValue);
                            break;
                        case 'path':
                            pathParams[param.name] = String(paramValue);
                            break;
                        case 'header':
                            headerParams[param.name] = String(paramValue);
                            break;
                        // Skip cookie parameters for now
                        case 'cookie':
                            break;
                    }
                }
            });
        }

        // Handle request body parameters (individual properties or full requestBody)
        if (endpoint.requestBody && endpoint.requestBody.content['application/json']) {
            const schema = endpoint.requestBody.content['application/json'].schema;

            if (schema.type === 'object' && schema.properties) {
                // Collect individual request body properties
                Object.keys(schema.properties).forEach(propName => {
                    if (parameters[propName] !== undefined && parameters[propName] !== null) {
                        requestBody[propName] = parameters[propName];
                    }
                });
            } else if (parameters.requestBody !== undefined) {
                // Use the full requestBody parameter (backward compatibility)
                requestBody = parameters.requestBody;
            }
        }

        // Replace path parameters in URL
        Object.entries(pathParams).forEach(([paramName, paramValue]) => {
            url = url.replace(`{${paramName}}`, encodeURIComponent(paramValue));
        });

        // Add query parameters to URL
        if (Object.keys(queryParams).length > 0) {
            const queryString = Object.entries(queryParams)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        const proxyRequestBody = {
            requestBody: Object.keys(requestBody).length > 0 ? requestBody : undefined,
            method: method,
            serverAddress: url,
            bearerToken: bearerToken && bearerToken.length > 0 ? bearerToken : undefined,
            headers: Object.keys(headerParams).length > 0 ? headerParams : undefined
        }

        const result = fetch(httpUrl + "/api/api-proxy/fetch", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(proxyRequestBody),
        }).then(response => response.json());
        console.log(JSON.stringify(result));
        return result;
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
        if (!ydata.has(AgentToolBearerToken)) {
            // @ts-ignore
            ydata.set(AgentToolBearerToken, new Y.Text())
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
            <ApiDocImportButton node={node} />
            <BearerTokenManageButton node={node} />
        </>
    }
}

