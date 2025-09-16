import {BaseMessage, BaseMessageProps} from "@forest/agent-chat/src/MessageTypes";
import React from "react";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {EditorNodeTypeM} from "../index";
import {Box} from "@mui/material";
import {ModifyConfirmation} from "../aiButtons/ModifyConfirmation";
import {NodeM, TreeM} from "@forest/schema";

export interface WritingMessageProps extends BaseMessageProps {
    nodeId: string;
    newContent: string;
    treeM: any;
}

const WritingMessageComponent: React.FC<WritingMessageProps> = ({
                                                                    content, nodeId, newContent, treeM
                                                                }) => {
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const handleClick = () => {
        setDialogOpen(true);
    };

    const handleClose = () => {
        setDialogOpen(false);
    };

    const handleAccept = async (modifiedContent: string) => {
        try {
            const nodeM = treeM.getNode(nodeId);
            if (nodeM) {
                await stageThisVersion(nodeM, "Before AI writing assistant modification");
                EditorNodeTypeM.setEditorContent(nodeM, modifiedContent);
            }
            handleClose();
        } catch (error) {
            alert("Error applying changes: " + (error instanceof Error ? error.message : String(error)));
        }
    };

    const getOriginalContent = () => {
        try {
            const nodeM = treeM.getNode(nodeId);
            return nodeM ? EditorNodeTypeM.getEditorContent(nodeM) : "";
        } catch (error) {
            console.error("Error getting original content:", error);
            return "";
        }
    };

    const getNodeTitle = () => {
        try {
            const nodeM: NodeM = treeM.getNode(nodeId);
            return nodeM ? nodeM.title() || "Untitled" : "Node not found";
        } catch (error) {
            console.error("Error getting node title:", error);
            return "Error loading title";
        }
    };

    return (
        <>
            {content && (
                <Box sx={{
                    '& img': {
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: 1,
                        display: 'block',
                        margin: '8px 0'
                    },
                    '& p': {
                        margin: '8px 0',
                        lineHeight: 1.5
                    },
                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                        margin: '16px 0 8px 0'
                    }
                }}>
                    <span dangerouslySetInnerHTML={{__html: content}}/>
                </Box>
            )}
            {newContent && (
                <Box sx={{
                    marginTop: 2,
                }}>
                    <Box sx={{
                        marginBottom: 1,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'rgba(25, 118, 210, 1)',
                    }}>
                        Modify: {getNodeTitle()}
                    </Box>
                    <Box sx={{
                        padding: 2,
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        borderRadius: 1,
                        border: '1px solid rgba(25, 118, 210, 0.23)',
                        cursor: 'pointer',
                        maxHeight: '300px',
                        overflow: 'hidden',
                        '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.12)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        },
                        transition: 'all 0.2s ease-in-out'
                    }}
                         onClick={handleClick}
                    >
                        <Box sx={{
                            '& img': {
                                maxWidth: '100%',
                                height: 'auto',
                                borderRadius: 1,
                                display: 'block',
                                margin: '8px 0'
                            },
                            '& p': {
                                margin: '8px 0',
                                lineHeight: 1.5
                            },
                            '& h1, & h2, & h3, & h4, & h5, & h6': {
                                margin: '16px 0 8px 0'
                            }
                        }}>
                            <span dangerouslySetInnerHTML={{__html: newContent}}/>
                        </Box>
                    </Box>
                </Box>
            )}

            <ModifyConfirmation
                open={dialogOpen}
                onClose={handleClose}
                onAccept={handleAccept}
                dialogTitle="Review AI Writing Suggestion"
                comparisonContent={{
                    original: {
                        title: "Original Content",
                        content: getOriginalContent()
                    },
                    modified: {
                        title: "AI Suggestion",
                        content: newContent
                    }
                }}
            />
        </>
    );
};

export interface TitleMessageProps extends BaseMessageProps {
    nodeId: string;
    newTitle: string;
    treeM: any;
}

export interface NewNodeMessageProps extends BaseMessageProps {
    parentId: string;
    newNodeTitle: string;
    newContent: string;
    treeM: TreeM;
}

const TitleMessageComponent: React.FC<TitleMessageProps> = ({
    content, nodeId, newTitle, treeM
}) => {
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const handleClick = () => {
        setDialogOpen(true);
    };

    const handleClose = () => {
        setDialogOpen(false);
    };

    const handleAccept = async () => {
        try {
            const nodeM: NodeM = treeM.getNode(nodeId);
            if (nodeM) {
                await stageThisVersion(nodeM, "Before AI title suggestion");
                nodeM.setTitle(newTitle);
            }
            handleClose();
        } catch (error) {
            alert("Error applying title change: " + (error instanceof Error ? error.message : String(error)));
        }
    };

    const getOriginalTitle = () => {
        try {
            const nodeM: NodeM = treeM.getNode(nodeId);
            return nodeM ? nodeM.title() || "Untitled" : "Node not found";
        } catch (error) {
            console.error("Error getting original title:", error);
            return "Error loading title";
        }
    };

    return (
        <>
            {content && (
                <Box sx={{
                    '& p': {
                        margin: '8px 0',
                        lineHeight: 1.5
                    }
                }}>
                    <span dangerouslySetInnerHTML={{__html: content}}/>
                </Box>
            )}
            <Box sx={{
                marginTop: 2,
            }}>
                <Box sx={{
                    marginBottom: 1,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'rgba(255, 152, 0, 1)',
                }}>
                    Change Title: {getOriginalTitle()} → {newTitle}
                </Box>
                <Box sx={{
                    padding: 2,
                    backgroundColor: 'rgba(255, 152, 0, 0.08)',
                    borderRadius: 1,
                    border: '1px solid rgba(255, 152, 0, 0.23)',
                    cursor: 'pointer',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 152, 0, 0.12)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    },
                    transition: 'all 0.2s ease-in-out'
                }}
                     onClick={handleClick}
                >
                    <Box sx={{ fontWeight: 600 }}>
                        {newTitle}
                    </Box>
                </Box>
            </Box>

            <ModifyConfirmation
                open={dialogOpen}
                onClose={handleClose}
                onAccept={handleAccept}
                dialogTitle="Review Title Suggestion"
                comparisonContent={{
                    original: {
                        title: "Current Title",
                        content: getOriginalTitle()
                    },
                    modified: {
                        title: "Suggested Title",
                        content: newTitle
                    }
                }}
            />
        </>
    );
};

const NewNodeMessageComponent: React.FC<NewNodeMessageProps> = ({
    content, parentId, newNodeTitle, newContent, treeM
}) => {
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const handleClick = () => {
        setDialogOpen(true);
    };

    const handleClose = () => {
        setDialogOpen(false);
    };

    const handleAccept = async (modifiedContent: string) => {
        try {
            const parentNode: NodeM = treeM.getNode(parentId);
            if (parentNode) {
                // Create new node using NodeM.newNode
                const newNodeM = NodeM.newNode(newNodeTitle, parentId, "EditorNodeType", treeM);
                // Insert node into tree structure at the end
                treeM.insertNode(newNodeM, parentId, null);
                EditorNodeTypeM.setEditorContent(newNodeM, modifiedContent);
            }
            handleClose();
        } catch (error) {
            alert("Error creating new node: " + (error instanceof Error ? error.message : String(error)));
        }
    };

    const getParentTitle = () => {
        try {
            const parentNode: NodeM = treeM.getNode(parentId);
            return parentNode ? parentNode.title() || "Untitled" : "Parent not found";
        } catch (error) {
            console.error("Error getting parent title:", error);
            return "Error loading parent title";
        }
    };

    return (
        <>
            {content && (
                <Box sx={{
                    '& p': {
                        margin: '8px 0',
                        lineHeight: 1.5
                    }
                }}>
                    <span dangerouslySetInnerHTML={{__html: content}}/>
                </Box>
            )}
            <Box sx={{
                marginTop: 2,
            }}>
                <Box sx={{
                    marginBottom: 1,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'rgba(76, 175, 80, 1)',
                }}>
                    Create New Node: "{newNodeTitle}" under {getParentTitle()}
                </Box>
                <Box sx={{
                    padding: 2,
                    backgroundColor: 'rgba(76, 175, 80, 0.08)',
                    borderRadius: 1,
                    border: '1px solid rgba(76, 175, 80, 0.23)',
                    cursor: 'pointer',
                    maxHeight: '300px',
                    overflow: 'hidden',
                    '&:hover': {
                        backgroundColor: 'rgba(76, 175, 80, 0.12)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    },
                    transition: 'all 0.2s ease-in-out'
                }}
                     onClick={handleClick}
                >
                    <Box sx={{ fontWeight: 600, marginBottom: 1 }}>
                        {newNodeTitle}
                    </Box>
                    <Box sx={{
                        '& img': {
                            maxWidth: '100%',
                            height: 'auto',
                            borderRadius: 1,
                            display: 'block',
                            margin: '8px 0'
                        },
                        '& p': {
                            margin: '8px 0',
                            lineHeight: 1.5
                        },
                        '& h1, & h2, & h3, & h4, & h5, & h6': {
                            margin: '16px 0 8px 0'
                        }
                    }}>
                        <span dangerouslySetInnerHTML={{__html: newContent}}/>
                    </Box>
                </Box>
            </Box>

            <ModifyConfirmation
                open={dialogOpen}
                onClose={handleClose}
                onAccept={handleAccept}
                dialogTitle="Review New Node Suggestion"
                comparisonContent={{
                    original: {
                        title: "Current State",
                        content: ""
                    },
                    modified: {
                        title: `New Node: "${newNodeTitle}"`,
                        content: newContent
                    }
                }}
            />
        </>
    );
};

export class WritingMessage extends BaseMessage {
    nodeId: string;
    newContent: string;
    treeM: any;

    constructor({content, author, role, nodeId, newContent, treeM}: WritingMessageProps) {
        super({content, author, role});
        this.nodeId = nodeId;
        this.newContent = newContent;
        this.treeM = treeM;
    }

    render(): React.ReactNode {
        return (
            <WritingMessageComponent
                content={this.content}
                nodeId={this.nodeId}
                newContent={this.newContent}
                treeM={this.treeM}
            />
        );
    }

    toJson(): object {
        return {
            ...super.toJson(),
            nodeId: this.nodeId,
            newContent: this.newContent
        };
    }
}

export class TitleMessage extends BaseMessage {
    nodeId: string;
    newTitle: string;
    treeM: any;

    constructor({content, author, role, nodeId, newTitle, treeM}: TitleMessageProps) {
        super({content, author, role});
        this.nodeId = nodeId;
        this.newTitle = newTitle;
        this.treeM = treeM;
    }

    render(): React.ReactNode {
        return (
            <TitleMessageComponent
                content={this.content}
                nodeId={this.nodeId}
                newTitle={this.newTitle}
                treeM={this.treeM}
            />
        );
    }

    toJson(): object {
        return {
            ...super.toJson(),
            nodeId: this.nodeId,
            newTitle: this.newTitle
        };
    }
}

export class NewNodeMessage extends BaseMessage {
    parentId: string;
    newNodeTitle: string;
    newContent: string;
    treeM: any;

    constructor({content, author, role, parentId, newNodeTitle, newContent, treeM}: NewNodeMessageProps) {
        super({content, author, role});
        this.parentId = parentId;
        this.newNodeTitle = newNodeTitle;
        this.newContent = newContent;
        this.treeM = treeM;
    }

    render(): React.ReactNode {
        return (
            <NewNodeMessageComponent
                content={this.content}
                parentId={this.parentId}
                newNodeTitle={this.newNodeTitle}
                newContent={this.newContent}
                treeM={this.treeM}
            />
        );
    }

    toJson(): object {
        return {
            ...super.toJson(),
            parentId: this.parentId,
            newNodeTitle: this.newNodeTitle,
            newContent: this.newContent
        };
    }
}