// MCP (Model Context Protocol) types and parser

export interface MCPTool {
    name: string;
    description?: string;
    inputSchema: {
        type: string;
        properties?: Record<string, any>;
        required?: string[];
    };
}

export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}

export interface MCPPrompt {
    name: string;
    description?: string;
    arguments?: Array<{
        name: string;
        description?: string;
        required?: boolean;
    }>;
}

export interface MCPServerInfo {
    name: string;
    version: string;
    capabilities?: {
        tools?: { listChanged?: boolean };
        resources?: { subscribe?: boolean; listChanged?: boolean };
        prompts?: { listChanged?: boolean };
        logging?: {};
    };
}

export interface MCPConnection {
    serverUrl: string;
    connected: boolean;
    serverInfo?: MCPServerInfo;
    tools: MCPTool[];
    resources: MCPResource[];
    prompts: MCPPrompt[];
    lastFetched?: Date;
    error?: string;
}

export interface MCPCallRequest {
    method: string;
    params?: any;
}

export interface MCPCallResponse {
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

/**
 * Parse MCP server response and extract tools
 */
export function parseMCPTools(response: any): MCPTool[] {
    if (!response || !response.result || !response.result.tools) {
        return [];
    }

    return response.result.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema || { type: 'object', properties: {} }
    }));
}

/**
 * Parse MCP server response and extract resources
 */
export function parseMCPResources(response: any): MCPResource[] {
    if (!response || !response.result || !response.result.resources) {
        return [];
    }

    return response.result.resources.map((resource: any) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType
    }));
}

/**
 * Parse MCP server response and extract prompts
 */
export function parseMCPPrompts(response: any): MCPPrompt[] {
    if (!response || !response.result || !response.result.prompts) {
        return [];
    }

    return response.result.prompts.map((prompt: any) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments || []
    }));
}

/**
 * Generate prompt description from MCP tool for Agent use
 */
export function generatePromptFromMCPTool(tool: MCPTool): string {
    const description = tool.description || 'No description provided.';
    let parametersPrompt = '';
    
    if (tool.inputSchema && tool.inputSchema.properties) {
        parametersPrompt = Object.entries(tool.inputSchema.properties)
            .map(([key, prop]: [string, any]) => {
                const type = prop.type || 'any';
                const desc = prop.description || '';
                const required = tool.inputSchema.required?.includes(key) ? ' (required)' : '';
                return `"${key}" (${type})${required}: ${desc}`;
            })
            .join('\n');
    }
    
    return `Title: ${tool.name}
Description: ${description}
Parameters:
${parametersPrompt}`;
}

/**
 * Create MCP tool call request
 */
export function createMCPToolCall(toolName: string, params: any): MCPCallRequest {
    return {
        method: 'tools/call',
        params: {
            name: toolName,
            arguments: params
        }
    };
}

/**
 * Create MCP list tools request
 */
export function createMCPListToolsRequest(): MCPCallRequest {
    return {
        method: 'tools/list',
        params: {}
    };
}

/**
 * Create MCP server initialize request
 */
export function createMCPInitializeRequest(): MCPCallRequest {
    return {
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {},
                resources: {},
                prompts: {}
            },
            clientInfo: {
                name: 'Forest-Agent',
                version: '1.0.0'
            }
        }
    };
}