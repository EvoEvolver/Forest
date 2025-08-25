import {BaseMessage, BaseMessageProps} from "@forest/agent-chat/src/MessageTypes";
import React from "react";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {EditorNodeTypeM} from "../index";
import {Box} from "@mui/material";
import {ModifyConfirmation} from "../aiButtons/ModifyConfirmation";

export interface WritingMessageProps extends BaseMessageProps {
    nodeId: string;
    newContent: string;
    treeM: any;
}

const WritingMessageComponent: React.FC<WritingMessageProps> = ({
                                                                    content, author, role, nodeId, newContent, treeM
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
                await stageThisVersion(nodeM.nodeVM, "Before AI writing assistant modification");
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
                    padding: 2,
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    borderRadius: 1,
                    border: '1px solid rgba(25, 118, 210, 0.23)',
                    cursor: 'pointer',
                    maxHeight: '300px',
                    overflow: 'auto',
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
                author={this.author}
                role={this.role}
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