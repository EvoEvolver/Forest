import React, { Suspense } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAtomValue } from 'jotai';
import { treeAtom } from '../TreeState/TreeState';
import { supportedNodeTypesVM } from '@forest/node-types/src/vmodel';

interface NodePreviewProps {
    nodeId: string | null;
}

interface NodePreviewErrorProps {
    error: Error;
    nodeId: string;
}

class NodeRenderErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.warn('Node render error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Typography color="error" variant="body2">
                    Render error: {this.state.error?.message || 'Unknown error'}
                </Typography>
            );
        }

        return this.props.children;
    }
}

function NodePreviewError({ error, nodeId }: NodePreviewErrorProps) {
    return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" variant="h6" gutterBottom>
                Preview Error
            </Typography>
            <Typography color="text.secondary" variant="body2" gutterBottom>
                Failed to render preview for node: {nodeId}
            </Typography>
            <Typography color="text.secondary" variant="caption">
                {error.message}
            </Typography>
        </Box>
    );
}

function NodePreviewContent({ nodeId }: { nodeId: string }) {
    const tree = useAtomValue(treeAtom);
    
    if (!tree || !nodeId) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                    No node selected
                </Typography>
            </Box>
        );
    }

    const nodeAtom = tree.nodeDict[nodeId];
    if (!nodeAtom) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                    Node not found: {nodeId}
                </Typography>
            </Box>
        );
    }

    const nodeVM = useAtomValue(nodeAtom);
    if (!nodeVM) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                    Node not loaded
                </Typography>
            </Box>
        );
    }

    const nodeTypeName = nodeVM.nodeTypeName;
    if (!nodeTypeName) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                    Unknown node type
                </Typography>
            </Box>
        );
    }

    // Get the appropriate NodeTypeVM for rendering
    const [nodeTypeVMState, setNodeTypeVMState] = React.useState<{
        class: any | null;
        loading: boolean;
        error: Error | null;
    }>({
        class: null,
        loading: true,
        error: null
    });

    React.useEffect(() => {
        let mounted = true;
        
        const loadNodeTypeVM = async () => {
            try {
                setNodeTypeVMState({ class: null, loading: true, error: null });
                const TypeVMClass = await supportedNodeTypesVM(nodeTypeName);
                if (mounted) {
                    setNodeTypeVMState({ class: TypeVMClass, loading: false, error: null });
                }
            } catch (err) {
                if (mounted) {
                    setNodeTypeVMState({ class: null, loading: false, error: err as Error });
                }
            }
        };

        loadNodeTypeVM();
        
        return () => {
            mounted = false;
        };
    }, [nodeTypeName, nodeId]);

    const { class: NodeTypeVMClass, loading, error } = nodeTypeVMState;

    if (loading) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress size={24} />
                <Typography sx={{ ml: 2 }} color="text.secondary">
                    Loading preview...
                </Typography>
            </Box>
        );
    }

    if (error || !NodeTypeVMClass) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error" variant="body2">
                    Failed to load node type: {nodeTypeName}
                </Typography>
                {error && (
                    <Typography color="text.secondary" variant="caption">
                        {error.message}
                    </Typography>
                )}
            </Box>
        );
    }

    try {
        // Render the node using its NodeTypeVM static method
        const renderedNode = NodeTypeVMClass.render(nodeVM);
        
        return (
            <Box 
                sx={{ 
                    p: 2,
                    height: '100%',
                    overflow: 'auto',
                    // Scale down content to fit in preview
                    '& > *': {
                        transform: 'scale(0.8)',
                        transformOrigin: 'top left',
                        width: '125%', // Compensate for scale
                    }
                }}
            >
                {/* Node title */}
                <Typography 
                    variant="subtitle2" 
                    gutterBottom 
                    sx={{ 
                        transform: 'none !important', 
                        width: 'auto !important',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        pb: 1,
                        mb: 2
                    }}
                >
                    {nodeVM.nodeM?.ymap?.get("title") || "Untitled"} ({nodeId.slice(0, 8)})
                </Typography>
                
                {/* Rendered node content */}
                <NodeRenderErrorBoundary>
                    {renderedNode}
                </NodeRenderErrorBoundary>
            </Box>
        );
    } catch (renderError) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error" variant="body2">
                    Render error: {renderError.message}
                </Typography>
            </Box>
        );
    }
}

class NodePreviewErrorBoundaryWrapper extends React.Component<
    { children: React.ReactNode; nodeId: string },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode; nodeId: string }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.warn('Node preview error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <NodePreviewError error={this.state.error!} nodeId={this.props.nodeId} />;
        }

        return this.props.children;
    }
}

export default function NodePreview({ nodeId }: NodePreviewProps) {
    if (!nodeId) {
        return (
            <Box 
                sx={{ 
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary'
                }}
            >
                <Typography variant="body2">
                    Select a node to preview
                </Typography>
            </Box>
        );
    }

    return (
        <NodePreviewErrorBoundaryWrapper nodeId={nodeId}>
            <Suspense fallback={
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                </Box>
            }>
                <NodePreviewContent key={nodeId} nodeId={nodeId} />
            </Suspense>
        </NodePreviewErrorBoundaryWrapper>
    );
}