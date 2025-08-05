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
                    authToken
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
            
            await handleConnect(connection.agentUrl, connection.authToken);
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
                
                const response = await client.sendMessage({
                    message,
                    configuration: {
                        blocking: true
                    }
                });

                return response;
            } catch (error) {
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
            
            const toolResponseMessage = new ToolResponseMessage({
                toolName: skillName,
                response: result,
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
            
            const response = await client.sendMessage({
                message,
                configuration: {
                    blocking: true
                }
            });

            return response;
        } catch (error) {
            throw new Error(`A2A agent call failed: ${error.message}`);
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