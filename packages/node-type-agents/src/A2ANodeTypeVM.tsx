import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";
import {NodeVM} from "@forest/schema";
import React, {useEffect, useState} from "react";
import {
    A2AAgentSkill,
    A2AClient,
    A2AConnection,
    connectToA2AAgent,
    createA2AMessage,
    getActiveAgentCard
} from "./a2a/a2aParser";
import * as Y from "yjs";
import {preprocessA2AResponse} from "./a2a/utils";
import A2AViewer from "./a2a/A2AViewer";
import CollaborativeEditor from "./CodeEditor";
import {json as jsonLang} from "@codemirror/lang-json";
import {A2AAgentUrlText, A2AConnectionCacheText, A2ANodeTypeM} from "./A2ANode";

export class A2ANodeTypeVM extends NodeTypeVM {
    static render(node: NodeVM): React.ReactNode {
        const [connection, setConnection] = useState<A2AConnection | null>(A2ANodeTypeM.getA2AConnection(node.nodeM));
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
                const newConnection = A2ANodeTypeM.getA2AConnection(node.nodeM);
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
                    A2ANodeTypeM.saveA2AConnection(node.nodeM, disconnectedConnection);
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
                    A2ANodeTypeM.saveA2AConnection(node.nodeM, disconnectedConnection);
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
                A2ANodeTypeM.saveAgentUrl(node.nodeM, agentUrl);

                // Connect to A2A agent
                const newConnection = await connectToA2AAgent(agentUrl, authToken);

                if (newConnection.connected) {
                    // Apply previously saved enabled states or default to all enabled
                    A2ANodeTypeM.applySkillEnabledStates(newConnection);

                    A2ANodeTypeM.saveA2AConnection(node.nodeM, newConnection);
                    setConnection(newConnection);

                    // Log streaming capability for debugging
                    const activeCard = getActiveAgentCard(newConnection);
                    console.log(`🔗 A2A agent connected: ${activeCard?.name || 'Unknown'} (streaming: ${newConnection.supportsStreaming})`);
                } else {
                    setError(newConnection.error || 'Failed to connect to A2A agent');
                    A2ANodeTypeM.saveA2AConnection(node.nodeM, newConnection);
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
                A2ANodeTypeM.saveA2AConnection(node.nodeM, failedConnection);
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
                A2ANodeTypeM.saveA2AConnection(node.nodeM, disconnectedConnection);
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
            const rawConnection = A2ANodeTypeM.getRawA2AConnection(node.nodeM);
            if (!rawConnection) return;

            // Apply current skill states to get the latest state
            A2ANodeTypeM.applySkillEnabledStates(rawConnection);

            const activeCard = getActiveAgentCard(rawConnection);
            if (!activeCard || !activeCard.skills) return;

            // Update skill enabled state in raw data
            const updatedSkills = activeCard.skills.map(skill =>
                skill.id === skillId ? {...skill, enabled} : skill
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
            A2ANodeTypeM.saveA2AConnection(node.nodeM, updatedConnection);

            // Update UI with filtered connection
            setConnection(A2ANodeTypeM.getA2AConnection(node.nodeM));
        };

        const handleGetAllSkills = (): A2AAgentSkill[] => {
            const rawConnection = A2ANodeTypeM.getRawA2AConnection(node.nodeM);
            if (!rawConnection) return [];

            // Apply current skill states and return all skills
            A2ANodeTypeM.applySkillEnabledStates(rawConnection);
            const activeCard = getActiveAgentCard(rawConnection);
            return activeCard?.skills || [];
        };

        const handleBulkToggleSkills = (enabled: boolean) => {
            // Get raw connection data (with all skills) for modification
            const rawConnection = A2ANodeTypeM.getRawA2AConnection(node.nodeM);
            if (!rawConnection) return;

            // Apply current skill states to get the latest state
            A2ANodeTypeM.applySkillEnabledStates(rawConnection);

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
            A2ANodeTypeM.saveA2AConnection(node.nodeM, updatedConnection);

            // Update UI with filtered connection
            setConnection(A2ANodeTypeM.getA2AConnection(node.nodeM));
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

    static renderTool1(node: NodeVM): React.ReactNode {
        return (
            <>
                <h1>A2A Agent URL</h1>
                <CollaborativeEditor yText={node.ydata.get(A2AAgentUrlText)} langExtension={jsonLang}/>
            </>
        );
    }

    static renderTool2(node: NodeVM): React.ReactNode {
        return (
            <>
                <h1>Connection Cache</h1>
                <CollaborativeEditor yText={node.ydata.get(A2AConnectionCacheText)} langExtension={jsonLang}/>
            </>
        );
    }
}