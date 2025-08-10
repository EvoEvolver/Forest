import { NodeM, NodeVM } from "@forest/schema";
import React, { useEffect, useState } from "react";
import * as Y from "yjs";
import CollaborativeEditor from "./CodeEditor";
import A2AViewer from "./a2a/A2AViewer";
import { json as jsonLang } from '@codemirror/lang-json';
import {
    A2AConnection,
    A2AAgentSkill,
    A2AClient,
    connectToA2AAgent,
    getActiveAgentCard,
    parseA2ASkills,
    generatePromptFromA2ASkill,
    createA2AMessage
} from "./a2a/a2aParser";
import { ActionableNodeType, Action, ActionParameter } from "./ActionableNodeType";
import { AgentSessionState } from "./sessionState";
import { ToolCallingMessage, ToolResponseMessage } from "@forest/agent-chat/src/AgentMessageTypes";

const A2AAgentUrlText = "A2AAgentUrlText";
const A2AConnectionCacheText = "A2AConnectionCacheText";

// Image processing utilities for A2A responses
interface A2AImageFile {
    bytes?: string;
    url?: string;
    mimeType: string;
    name: string;
}

interface A2AImagePart {
    kind: string;
    file?: A2AImageFile;
}

interface A2AArtifact {
    artifactId?: string;
    description?: string;
    name?: string;
    parts?: A2AImagePart[];
}

// Upload image from base64 bytes to image bed (adapted from image-upload.tsx)
async function uploadImageFromBase64(base64Bytes: string, mimeType: string, fileName: string): Promise<string> {
    console.log(`🖼️ [A2A Image] Starting image upload: ${fileName}, type: ${mimeType}`);
    
    try {
        // Convert base64 to blob
        const binaryString = atob(base64Bytes);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        
        console.log(`🖼️ [A2A Image] Converted base64 to blob: ${blob.size} bytes`);
        
        // Create file from blob
        const file = new File([blob], fileName, { type: mimeType });
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            throw new Error(`Invalid file type: ${file.type}`);
        }
        
        if (file.size > 10 * 1024 * 1024) {
            throw new Error(`File too large: ${file.size} bytes (max 10MB)`);
        }
        
        // Prepare upload
        const formData = new FormData();
        formData.append('image', file);
        
        // Get upload URL - use the same endpoint as image-upload.tsx
        const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
        const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;
        const uploadUrl = `${httpUrl}/api/images/upload`;
        
        console.log(`🖼️ [A2A Image] Uploading to: ${uploadUrl}`);
        
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Upload failed with status ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`🖼️ [A2A Image] Upload result:`, result);
        
        if (result.success && result.url) {
            console.log(`✅ [A2A Image] Successfully uploaded: ${result.url}`);
            return result.url;
        } else {
            throw new Error(result.error || 'Upload failed - no URL returned');
        }
        
    } catch (error: any) {
        console.error(`❌ [A2A Image] Upload failed:`, error);
        throw new Error(`Image upload failed: ${error.message}`);
    }
}

// Preprocess A2A response to convert image bytes to URLs  
async function preprocessA2AResponse(response: any): Promise<any> {
    console.log(`🔍 [A2A Preprocessor] Processing response for images...`);
    
    if (!response || typeof response !== 'object') {
        console.log(`🔍 [A2A Preprocessor] No response object to process`);
        return response;
    }
    
    // Check if response has artifacts with image files
    let artifacts: A2AArtifact[] = [];
    
    // Handle different response structures
    if (response.artifacts) {
        artifacts = response.artifacts;
    } else if (response.result && response.result.artifacts) {
        artifacts = response.result.artifacts;
    } else if (Array.isArray(response) && response.length > 0 && response[0].artifacts) {
        artifacts = response[0].artifacts;
    }
    
    if (!artifacts || artifacts.length === 0) {
        console.log(`🔍 [A2A Preprocessor] No artifacts found in response`);
        return response;
    }
    
    console.log(`🔍 [A2A Preprocessor] Found ${artifacts.length} artifacts to check`);
    
    let imageProcessingCount = 0;
    
    // Process each artifact
    for (const artifact of artifacts) {
        if (!artifact.parts || !Array.isArray(artifact.parts)) {
            continue;
        }
        
        console.log(`🔍 [A2A Preprocessor] Checking artifact with ${artifact.parts.length} parts`);
        
        // Process each part in the artifact
        for (const part of artifact.parts) {
            if (part.kind === 'file' && part.file) {
                const file = part.file;
                
                // Check if it's an image file with base64 bytes
                if (file.mimeType && 
                    file.mimeType.startsWith('image/') && 
                    file.bytes && 
                    !file.url) {
                    
                    console.log(`🔍 [A2A Preprocessor] Found image file to process: ${file.name}, type: ${file.mimeType}`);
                    imageProcessingCount++;
                    
                    try {
                        // Upload the image and get URL
                        const uploadedUrl = await uploadImageFromBase64(
                            file.bytes, 
                            file.mimeType, 
                            file.name || `image_${Date.now()}.${file.mimeType.split('/')[1]}`
                        );
                        
                        // Replace bytes with URL
                        delete file.bytes;
                        file.url = uploadedUrl;
                        
                        console.log(`✅ [A2A Preprocessor] Successfully converted image to URL: ${uploadedUrl}`);
                        
                    } catch (error: any) {
                        console.error(`❌ [A2A Preprocessor] Failed to process image ${file.name}:`, error);
                        // Keep the original bytes if upload fails
                        // You could also choose to remove the image or add an error field
                    }
                }
            }
        }
    }
    
    if (imageProcessingCount > 0) {
        console.log(`🔍 [A2A Preprocessor] Processed ${imageProcessingCount} images in response`);
    } else {
        console.log(`🔍 [A2A Preprocessor] No images found to process`);
    }
    
    return response;
}

export class A2ANodeType extends ActionableNodeType {
    displayName = "A2A Agent"
    allowReshape = true
    allowAddingChildren = false
    allowEditTitle = true

    getAgentUrl(node: NodeM): string | null {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(A2AAgentUrlText) as Y.Text;
        if (!yText) {
            return null;
        }
        const url = yText.toString().trim();
        return url || null;
    }

    private getRawA2AConnection(node: NodeM): A2AConnection | null {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(A2AConnectionCacheText) as Y.Text;
        if (!yText) {
            return null;
        }
        try {
            const connection = JSON.parse(yText.toString());
            // Convert date strings back to Date objects
            if (connection.lastFetched) {
                connection.lastFetched = new Date(connection.lastFetched);
            }
            return connection;
        } catch (e) {
            return null;
        }
    }

    getA2AConnection(node: NodeM): A2AConnection | null {
        const connection = this.getRawA2AConnection(node);
        if (!connection) {
            return null;
        }
        
        // Apply skill enabled states and filter out disabled skills
        this.applySkillEnabledStates(connection);
        
        // Return connection with only enabled skills - disabled skills are invisible to the model
        const activeCard = getActiveAgentCard(connection);
        if (activeCard && activeCard.skills) {
            const filteredConnection = {
                ...connection,
                agentCard: connection.agentCard ? {
                    ...connection.agentCard,
                    skills: connection.agentCard.skills?.filter(skill => skill.enabled !== false)
                } : connection.agentCard,
                extendedCard: connection.extendedCard ? {
                    ...connection.extendedCard,
                    skills: connection.extendedCard.skills?.filter(skill => skill.enabled !== false)
                } : connection.extendedCard
            };
            return filteredConnection;
        }
        
        return connection;
    }

    private saveA2AConnection(node: NodeM, connection: A2AConnection) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(A2AConnectionCacheText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(connection, null, 2));
        }
    }

    private saveAgentUrl(node: NodeM, url: string) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(A2AAgentUrlText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, url);
        }
    }

    private applySkillEnabledStates(connection: A2AConnection) {
        const activeCard = getActiveAgentCard(connection);
        if (!activeCard || !activeCard.skills) {
            return;
        }

        // Get previously saved enabled states
        const savedEnabledSkills = (connection as any).enabledSkills;
        
        // If enabledSkills is undefined, this is the first time - default all to enabled
        if (savedEnabledSkills === undefined) {
            // First time initialization - enable all skills
            activeCard.skills = activeCard.skills.map(skill => ({
                ...skill,
                enabled: true
            }));
            (connection as any).enabledSkills = activeCard.skills.map(skill => skill.id);
        } else {
            // Apply saved enabled states
            const savedEnabledSet = new Set(savedEnabledSkills);
            activeCard.skills = activeCard.skills.map(skill => ({
                ...skill,
                enabled: savedEnabledSet.has(skill.id)
            }));
            
            // Update enabledSkills array to match current state
            (connection as any).enabledSkills = activeCard.skills
                .filter(skill => skill.enabled !== false)
                .map(skill => skill.id);
        }
    }

    render(node: NodeVM): React.ReactNode {
        const [connection, setConnection] = useState<A2AConnection | null>(this.getA2AConnection(node.nodeM));
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

        // @ts-ignore
        const urlYText: Y.Text = node.ydata.get(A2AAgentUrlText) as Y.Text;
        // @ts-ignore
        const cacheYText: Y.Text = node.ydata.get(A2AConnectionCacheText) as Y.Text;

        useEffect(() => {
            const observer = () => {
                // Use filtered connection for UI display
                const newConnection = this.getA2AConnection(node.nodeM);
                setConnection(newConnection);
            };

            cacheYText.observe(observer);
            return () => {
                cacheYText.unobserve(observer);
            };
        }, [cacheYText, node.nodeM]);

        const checkConnectionStatus = async () => {
            if (!connection || !connection.connected || !connection.agentUrl) return;

            try {
                const client = new A2AClient(connection.agentUrl, connection.authToken);
                // Try to get agent card to check if connection is still valid
                const testConnection = await connectToA2AAgent(connection.agentUrl, connection.authToken);
                
                if (connection.connected && !testConnection.connected) {
                    console.log(`A2A connection health check failed, updating status`);
                    const disconnectedConnection: A2AConnection = {
                        ...connection,
                        connected: false,
                        error: testConnection.error || 'Connection lost',
                        agentCard: undefined,
                        extendedCard: undefined
                    };
                    this.saveA2AConnection(node.nodeM, disconnectedConnection);
                    setConnection(disconnectedConnection);
                    setError(testConnection.error || 'Connection lost');
                }
            } catch (err: any) {
                if (connection.connected) {
                    console.log(`A2A agent unreachable, assuming disconnected`);
                    const disconnectedConnection: A2AConnection = {
                        ...connection,
                        connected: false,
                        error: 'Agent unreachable',
                        agentCard: undefined,
                        extendedCard: undefined
                    };
                    this.saveA2AConnection(node.nodeM, disconnectedConnection);
                    setConnection(disconnectedConnection);
                    setError('Agent unreachable');
                }
            }
        };

        // Start/stop status checking based on connection state
        useEffect(() => {
            if (connection && connection.connected && connection.agentUrl) {
                // Immediately check connection status when component mounts or connection becomes available
                checkConnectionStatus();
                
                // Start periodic status checking every 10 seconds
                const interval = setInterval(() => {
                    checkConnectionStatus();
                }, 10000);
                
                setStatusCheckInterval(interval);
                
                return () => {
                    clearInterval(interval);
                };
            } else {
                // Stop status checking if disconnected
                if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                    setStatusCheckInterval(null);
                }
            }
        }, [connection?.connected, connection?.agentUrl]);

        // Cleanup on unmount
        useEffect(() => {
            return () => {
                if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                }
            };
        }, [statusCheckInterval]);

        const handleConnect = async (agentUrl: string, authToken?: string) => {
            setLoading(true);
            setError(null);

            try {
                // Save agent URL
                this.saveAgentUrl(node.nodeM, agentUrl);

                // Connect to A2A agent
                const newConnection = await connectToA2AAgent(agentUrl, authToken);

                if (newConnection.connected) {
                    // Apply previously saved enabled states or default to all enabled
                    this.applySkillEnabledStates(newConnection);
                    
                    this.saveA2AConnection(node.nodeM, newConnection);
                    setConnection(newConnection);
                    
                    // Log streaming capability for debugging
                    const activeCard = getActiveAgentCard(newConnection);
                    console.log(`🔗 A2A agent connected: ${activeCard?.name || 'Unknown'} (streaming: ${newConnection.supportsStreaming})`);
                } else {
                    setError(newConnection.error || 'Failed to connect to A2A agent');
                    this.saveA2AConnection(node.nodeM, newConnection);
                    setConnection(newConnection);
                }

            } catch (err: any) {
                console.error('A2A connection error:', err);
                setError(err.message || 'Failed to connect to A2A agent');
                
                // Save disconnected state
                const failedConnection: A2AConnection = {
                    agentUrl,
                    connected: false,
                    error: err.message,
                    authToken,
                    supportsStreaming: false
                };
                this.saveA2AConnection(node.nodeM, failedConnection);
                setConnection(failedConnection);
            } finally {
                setLoading(false);
            }
        };

        const handleDisconnect = async () => {
            if (!connection) return;

            setLoading(true);
            try {
                const disconnectedConnection: A2AConnection = {
                    ...connection,
                    connected: false,
                    agentCard: undefined,
                    extendedCard: undefined
                };
                this.saveA2AConnection(node.nodeM, disconnectedConnection);
                setConnection(disconnectedConnection);
            } finally {
                setLoading(false);
            }
        };

        const handleRefresh = async () => {
            if (!connection || !connection.agentUrl) return;
            
            // First check the current status
            await checkConnectionStatus();
            
            // Then try to reconnect if we still think we should be connected
            if (connection.connected && connection.agentUrl) {
                await handleConnect(connection.agentUrl, connection.authToken);
            }
        };

        const handleExecuteSkill = async (skillId: string, params: any, authToken?: string) => {
            if (!connection || !connection.connected) {
                throw new Error('Not connected to A2A agent');
            }

            const activeCard = getActiveAgentCard(connection);
            if (!activeCard) {
                throw new Error('No active agent card available');
            }
            
            try {
                const client = new A2AClient(connection.agentUrl, authToken || connection.authToken);
                const message = createA2AMessage(params.query || JSON.stringify(params));
                
                // Configure based on agent's streaming capability
                const configuration = {
                    blocking: true,
                    // For non-streaming agents, ensure we use synchronous mode
                    ...(connection.supportsStreaming === false && { 
                        acceptedOutputModes: ['text'], // Request simple text output
                    })
                };
                
                console.log(`🎯 Executing A2A skill (streaming support: ${connection.supportsStreaming})`);
                
                const response = await client.sendMessage({
                    message,
                    configuration
                });

                // Preprocess the response to handle any image artifacts
                console.log(`🔄 [A2A handleExecuteSkill] Starting response preprocessing for skill: ${skillId}`);
                const processedResponse = await preprocessA2AResponse(response);
                console.log(`🔄 [A2A handleExecuteSkill] Response preprocessing completed for skill: ${skillId}`);

                return processedResponse;
            } catch (error) {
                // Provide more context for streaming-related errors
                if (error.message?.includes('streaming')) {
                    throw new Error(`A2A agent communication failed (agent streaming support: ${connection.supportsStreaming}): ${error.message}`);
                }
                throw error;
            }
        };

        const handleToggleSkillEnabled = (skillId: string, enabled: boolean) => {
            // Get raw connection data (with all skills) for modification
            const rawConnection = this.getRawA2AConnection(node.nodeM);
            if (!rawConnection) return;
            
            // Apply current skill states to get the latest state
            this.applySkillEnabledStates(rawConnection);
            
            const activeCard = getActiveAgentCard(rawConnection);
            if (!activeCard || !activeCard.skills) return;
            
            // Update skill enabled state in raw data
            const updatedSkills = activeCard.skills.map(skill => 
                skill.id === skillId ? { ...skill, enabled } : skill
            );
            
            // Update the active card with new skills
            if (rawConnection.extendedCard && rawConnection.extendedCard === activeCard) {
                rawConnection.extendedCard.skills = updatedSkills;
            } else if (rawConnection.agentCard && rawConnection.agentCard === activeCard) {
                rawConnection.agentCard.skills = updatedSkills;
            }
            
            // Rebuild enabledSkills array from the updated skills
            const updatedEnabledSkills = updatedSkills
                .filter(skill => skill.enabled !== false)
                .map(skill => skill.id);
            
            const updatedConnection = {
                ...rawConnection,
                enabledSkills: updatedEnabledSkills
            };
            
            // Save updated raw connection
            this.saveA2AConnection(node.nodeM, updatedConnection);
            
            // Update UI with filtered connection
            setConnection(this.getA2AConnection(node.nodeM));
        };

        const handleGetAllSkills = (): A2AAgentSkill[] => {
            const rawConnection = this.getRawA2AConnection(node.nodeM);
            if (!rawConnection) return [];
            
            // Apply current skill states and return all skills
            this.applySkillEnabledStates(rawConnection);
            const activeCard = getActiveAgentCard(rawConnection);
            return activeCard?.skills || [];
        };

        const handleBulkToggleSkills = (enabled: boolean) => {
            // Get raw connection data (with all skills) for modification
            const rawConnection = this.getRawA2AConnection(node.nodeM);
            if (!rawConnection) return;
            
            // Apply current skill states to get the latest state
            this.applySkillEnabledStates(rawConnection);
            
            const activeCard = getActiveAgentCard(rawConnection);
            if (!activeCard || !activeCard.skills) return;
            
            // Update all skills to the same enabled state
            const updatedSkills = activeCard.skills.map(skill => ({
                ...skill,
                enabled
            }));
            
            // Update the active card with new skills
            if (rawConnection.extendedCard && rawConnection.extendedCard === activeCard) {
                rawConnection.extendedCard.skills = updatedSkills;
            } else if (rawConnection.agentCard && rawConnection.agentCard === activeCard) {
                rawConnection.agentCard.skills = updatedSkills;
            }
            
            // Rebuild enabledSkills array from the updated skills
            const updatedEnabledSkills = enabled 
                ? updatedSkills.map(skill => skill.id)
                : [];
            
            const updatedConnection = {
                ...rawConnection,
                enabledSkills: updatedEnabledSkills
            };
            
            // Save updated raw connection
            this.saveA2AConnection(node.nodeM, updatedConnection);
            
            // Update UI with filtered connection
            setConnection(this.getA2AConnection(node.nodeM));
        };

        return (
            <div>
                <A2AViewer
                    connection={connection}
                    loading={loading}
                    error={error}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onRefresh={handleRefresh}
                    onExecuteSkill={handleExecuteSkill}
                    onToggleSkillEnabled={handleToggleSkillEnabled}
                    onGetAllSkills={handleGetAllSkills}
                    onBulkToggleSkills={handleBulkToggleSkills}
                />
            </div>
        );
    }

    renderTool1(node: NodeVM): React.ReactNode {
        return (
            <>
                <h1>A2A Agent URL</h1>
                <CollaborativeEditor yText={node.ydata.get(A2AAgentUrlText)} langExtension={jsonLang}/>
            </>
        );
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return (
            <>
                <h1>Connection Cache</h1>
                <CollaborativeEditor yText={node.ydata.get(A2AConnectionCacheText)} langExtension={jsonLang}/>
            </>
        );
    }

    actions(node: NodeM): Action[] {
        const connection = this.getA2AConnection(node);
        if (!connection || !connection.connected) {
            return [];
        }

        const activeCard = getActiveAgentCard(connection);
        if (!activeCard || !activeCard.skills || activeCard.skills.length === 0) {
            return [];
        }

        return activeCard.skills.map(skill => {
            const parameters: Record<string, ActionParameter> = {
                query: {
                    type: "string",
                    description: "The message or query to send to the agent"
                }
            };

            return {
                label: `${skill.name}`,
                description: skill.description || `Execute A2A agent skill: ${skill.name}`,
                parameter: parameters
            };
        });
    }

    async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const connection = this.getA2AConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("A2A agent not connected");
        }

        const activeCard = getActiveAgentCard(connection);
        if (!activeCard) {
            throw new Error("No active agent card available");
        }

        const skillName = label;
        const skill = activeCard.skills?.find(s => s.name === skillName);
        if (!skill) {
            throw new Error(`Skill ${skillName} not found`);
        }

        const toolCallingMessage = new ToolCallingMessage({
            toolName: skillName,
            parameters: parameters,
            author: callerNode.title(),
        });
        agentSessionState.addMessage(callerNode, toolCallingMessage);

        try {
            const result = await this.callA2AAgent(node, skill.id, parameters);
            
            // Preprocess the result to handle any image artifacts
            console.log(`🔄 [A2A executeAction] Starting response preprocessing for skill: ${skillName}`);
            const processedResult = await preprocessA2AResponse(result);
            console.log(`🔄 [A2A executeAction] Response preprocessing completed for skill: ${skillName}`);
            
            const toolResponseMessage = new ToolResponseMessage({
                toolName: skillName,
                response: processedResult,
                author: node.title(),
            });
            agentSessionState.addMessage(callerNode, toolResponseMessage);
            
            return toolResponseMessage;
        } catch (error) {
            const errorMessage = new ToolResponseMessage({
                toolName: skillName,
                response: { error: error.message },
                author: node.title(),
            });
            agentSessionState.addMessage(callerNode, errorMessage);
            throw error;
        }
    }

    renderPrompt(node: NodeM): string {
        const connection = this.getA2AConnection(node);
        if (!connection || !connection.connected) {
            return '';
        }

        const activeCard = getActiveAgentCard(connection);
        if (!activeCard || !activeCard.skills || activeCard.skills.length === 0) {
            return '';
        }

        // Apply skill enabled states before generating prompts
        this.applySkillEnabledStates(connection);
        
        // Only include enabled skills in the prompt
        const enabledSkills = activeCard.skills.filter(skill => skill.enabled !== false);
        
        if (enabledSkills.length === 0) {
            return '';
        }

        const skillPrompts = enabledSkills.map(skill => generatePromptFromA2ASkill(skill)).join('\n-------\n');
        
        return skillPrompts;
    }

    async callA2AAgent(node: NodeM, skillId: string, params: any) {
        const connection = this.getA2AConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("A2A agent not connected");
        }

        const activeCard = getActiveAgentCard(connection);
        if (!activeCard) {
            throw new Error("No active agent card available");
        }

        try {
            const client = new A2AClient(connection.agentUrl, connection.authToken);
            const message = createA2AMessage(params.query || JSON.stringify(params));
            
            // Configure based on agent's streaming capability
            const configuration = {
                blocking: true,
                // For non-streaming agents, ensure we use synchronous mode
                ...(connection.supportsStreaming === false && { 
                    acceptedOutputModes: ['text'], // Request simple text output
                })
            };
            
            console.log(`🎯 Calling A2A agent (streaming support: ${connection.supportsStreaming})`);
            
            const response = await client.sendMessage({
                message,
                configuration
            });

            // Preprocess the response to handle any image artifacts
            console.log(`🔄 [A2A callA2AAgent] Starting response preprocessing`);
            const processedResponse = await preprocessA2AResponse(response);
            console.log(`🔄 [A2A callA2AAgent] Response preprocessing completed`);

            return processedResponse;
        } catch (error) {
            // Provide more context for streaming-related errors
            const errorMessage = error.message?.includes('streaming')
                ? `A2A agent call failed (agent streaming support: ${connection.supportsStreaming}): ${error.message}`
                : `A2A agent call failed: ${error.message}`;
            throw new Error(errorMessage);
        }
    }

    ydataInitialize(node: NodeM) {
        const ydata = node.ydata();
        if (!ydata.has(A2AAgentUrlText)) {
            // @ts-ignore
            ydata.set(A2AAgentUrlText, new Y.Text());
        }
        if (!ydata.has(A2AConnectionCacheText)) {
            // @ts-ignore
            ydata.set(A2AConnectionCacheText, new Y.Text());
        }
    }
}