import {NodeM} from "@forest/schema";
import * as Y from "yjs";
import axios from "axios";
import {Action, ActionableNodeType} from "./ActionableNodeType";
import {AgentSessionState} from "./sessionState";
import {ToolCallingMessage, ToolResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";

export const CodeInterpreterCodeText = "CodeInterpreterCodeText"
export const CodeInterpreterEndpointUrl = "CodeInterpreterEndpointUrl"
export const CodeInterpreterDescriptionText = "CodeInterpreterDescriptionText"
export const CodeInterpreterParameterText = "CodeInterpreterParameterText"

export class CodeInterpreterNodeTypeM extends ActionableNodeType {
    static displayName = "Code Interpreter"
    static allowReshape = true
    static allowAddingChildren = false
    static allowEditTitle = true
    static allowedChildrenTypes = []

    static ydataInitialize(node: NodeM) {
        const ydata = node.ydata();
        if (!ydata.has(CodeInterpreterCodeText)) {
            ydata.set(CodeInterpreterCodeText, new Y.Text());
        }
        if (!ydata.has(CodeInterpreterEndpointUrl)) {
            ydata.set(CodeInterpreterEndpointUrl, new Y.Text());
        }
        if (!ydata.has(CodeInterpreterDescriptionText)) {
            ydata.set(CodeInterpreterDescriptionText, new Y.Text());
        }
        if (!ydata.has(CodeInterpreterParameterText)) {
            ydata.set(CodeInterpreterParameterText, new Y.Text());
        }
    }

    static codeYText(node: NodeM): Y.Text {
        return node.ydata().get(CodeInterpreterCodeText) as Y.Text;
    }

    static endpointUrlYText(node: NodeM): Y.Text {
        return node.ydata().get(CodeInterpreterEndpointUrl) as Y.Text;
    }

    static descriptionYText(node: NodeM): Y.Text {
        return node.ydata().get(CodeInterpreterDescriptionText) as Y.Text;
    }

    static parameterYText(node: NodeM): Y.Text {
        return node.ydata().get(CodeInterpreterParameterText) as Y.Text;
    }

    static renderPrompt(node: NodeM): string {
        return CodeInterpreterNodeTypeM.descriptionYText(node).toJSON();
    }

    static actions(node: NodeM): Action[] {
        const description = CodeInterpreterNodeTypeM.descriptionYText(node).toString();
        const parametersText = CodeInterpreterNodeTypeM.parameterYText(node).toString();

        // Parse parameters from the ydata
        let parameters: Record<string, any> = {};

        if (parametersText.trim()) {
            try {
                const parametersObj = JSON.parse(parametersText);
                if (typeof parametersObj === 'object' && parametersObj !== null && !Array.isArray(parametersObj)) {
                    // Merge the parsed parameters with the default code parameter
                    parameters = {...parametersObj};
                }
            } catch (error) {
                // If parameters are invalid JSON, just use the default code parameter
            }
        }

        return [{
            label: "Run " + node.title(),
            description: description || "Execute Python code in the interpreter",
            parameter: parameters
        }];
    }

    static async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const code = CodeInterpreterNodeTypeM.codeYText(node).toString();
        const url = CodeInterpreterNodeTypeM.endpointUrlYText(node)?.toString().trim();
        console.log(code, url, parameters);

        if (!url) {
            throw new Error("No endpoint URL configured for code interpreter");
        }

        if (!code?.trim()) {
            throw new Error("No code provided to execute");
        }

        // Extract all parameters except 'code' to pass as execution parameters
        const executionParameters: Record<string, any> = {};
        Object.keys(parameters).forEach(key => {
            if (key !== 'code') {
                executionParameters[key] = parameters[key];
            }
        });

        try {
            const requestBody: any = {code};
            if (Object.keys(executionParameters).length > 0) {
                requestBody.parameters = executionParameters;
            }
            agentSessionState.addMessage(callerNode, new ToolCallingMessage({
                toolName: node.title(),
                parameters: executionParameters,
                author: node.title(),
            }));

            const response = await axios.post(url, requestBody);
            const result = response.data["result"];
            agentSessionState.addMessage(callerNode, new ToolResponseMessage({
                toolName: node.title(),
                response: result,
                author: node.title(),
            }));

        } catch (error: any) {
            throw new Error(`Code execution failed: ${error.message}`);
        }
    }
}