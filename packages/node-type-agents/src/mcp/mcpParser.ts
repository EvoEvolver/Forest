// MCP (Model Context Protocol) types and parser

export interface MCPTool {
    name: string;
    description?: string;
    inputSchema: {
        type: string;
        properties?: Record<string, any>;
        required?: string[];
    };
    enabled?: boolean; // Whether this tool is enabled by the user
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

// Simplified MCPConnection - only runtime state, not synced to yjs
export interface MCPConnection {
    toolsetUrl: string;
    configHash: string;
    connected: boolean;
    tools: MCPTool[];  // Full tool list, browser cache only
    lastFetched?: Date;  // Keep this for UI display
    serverInfo?: MCPServerInfo; // Keep this for UI display
    error?: string; // Keep this for error display
}

// Tool enabled state map - synced to yjs
export type ToolEnabledMap = Record<string, boolean>;

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
 * Parse MCP server response and extract tools (legacy format - still supported)
 */
export function parseMCPTools(response: any): MCPTool[] {
    // Try new Toolset format first
    if (response && response.result && response.result.tools) {
        return response.result.tools.map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema || { type: 'object', properties: {} }
        }));
    }
    
    // Fallback to legacy format
    if (response && response.tools) {
        return response.tools.map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema || { type: 'object', properties: {} }
        }));
    }

    return [];
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
 * Create MCP tool call request (legacy format - still used internally)
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
 * Create Toolset API request payload for tool execution
 */
export function createToolsetToolCall(toolsetUrl: string, mcpConfig: any, toolName: string, params: any, configHash: string) {
    return {
        toolsetUrl,
        mcpConfig,
        toolName,
        arguments: params,
        configHash
    };
}

/**
 * Create Toolset API request payload for connection
 */
export function createToolsetConnection(toolsetUrl: string, mcpConfig: any) {
    return {
        toolsetUrl,
        mcpConfig
    };
}

/**
 * Create MCP list tools request (legacy format - deprecated)
 */
export function createMCPListToolsRequest(): MCPCallRequest {
    return {
        method: 'tools/list',
        params: {}
    };
}

/**
 * Create MCP server initialize request (legacy format - deprecated)
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

/**
 * Parse Toolset response and extract tools (new format)
 */
export function parseToolsetTools(response: any): MCPTool[] {
    if (!response || !response.result || !response.result.tools) {
        return [];
    }

    return response.result.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema || { type: 'object', properties: {} }
    }));
}