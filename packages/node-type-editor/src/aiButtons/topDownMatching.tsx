import * as React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import {NodeM, NodeVM} from "@forest/schema";
import {EditorNodeTypeM} from "..";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {Card} from "@mui/material";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import SyncIcon from '@mui/icons-material/Sync';
import {ModifyConfirmation} from "./ModifyConfirmation";
import pRetry from 'p-retry';

export const TopDownMatchingButton: React.FC<{ node: NodeVM }> = ({node}) => {
        const [loading, setLoading] = React.useState(false);
        const [currentChildIndex, setCurrentChildIndex] = React.useState(-1);
        const [updatedChildren, setUpdatedChildren] = React.useState<TitleAndContent[]>([]);
        const [originalChildren, setOriginalChildren] = React.useState<TitleAndContent[]>([]);
        const [processingStatus, setProcessingStatus] = React.useState<string>('');
        const authToken = useAtomValue(authTokenAtom)

        const handleClick = async () => {
            setLoading(true);
            setProcessingStatus('');
            try {
                const treeM = node.nodeM.treeM;
                const childrenNodes = treeM.getChildren(node.nodeM).filter((n) => n.nodeTypeName() === "EditorNodeType" && n.data()["archived"] !== true);
                const originalChildrenData = childrenNodes.map(child => ({
                    title: child.title(),
                    content: EditorNodeTypeM.getEditorContent(child)
                }));
                
                const titleAndContents = await getTopDownMatchingChildren(node.nodeM, authToken, setProcessingStatus);
                
                if (titleAndContents.length === 0) {
                    alert("No updates needed. Children are already consistent with the parent.");
                    return;
                }
                
                setOriginalChildren(originalChildrenData);
                setUpdatedChildren(titleAndContents);
                setCurrentChildIndex(0);
            } finally {
                setLoading(false);
                setProcessingStatus('');
            }
        };

        const handleCloseDialog = () => {
            setCurrentChildIndex(-1);
            setUpdatedChildren([]);
            setOriginalChildren([]);
        };

        const handleAccept = async (modifiedContent: string) => {
            await stageThisVersion(node, "Before top-down matching update");
            
            if (currentChildIndex >= 0 && currentChildIndex < updatedChildren.length) {
                const currentChild = updatedChildren[currentChildIndex];
                const treeM = node.nodeM.treeM;
                const childrenNodes = treeM.getChildren(node.nodeM).filter((n) => n.nodeTypeName() === "EditorNodeType" && n.data()["archived"] !== true);
                const childNode = childrenNodes.find(child => child.title() === currentChild.title);
                
                if (childNode) {
                    try {
                        EditorNodeTypeM.setEditorContent(childNode, modifiedContent);
                    } catch (e) {
                        alert(e)
                    }
                }
            }
            
            if (currentChildIndex < updatedChildren.length - 1) {
                setCurrentChildIndex(currentChildIndex + 1);
            } else {
                handleCloseDialog();
            }
        };

        const handleSkip = () => {
            if (currentChildIndex < updatedChildren.length - 1) {
                setCurrentChildIndex(currentChildIndex + 1);
            } else {
                handleCloseDialog();
            }
        };

        return (
            <>
                <Card
                    sx={{
                        cursor: 'pointer',
                        boxShadow: 3,
                        '&:hover': {
                            boxShadow: 6,
                            transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.2s ease-in-out',
                        margin: "10px 0",
                        borderRadius: "10px"
                    }}
                    onClick={handleClick}
                >
                    <CardContent sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                        <SyncIcon color="primary"/>
                        <div>
                            <Typography variant="body1" component="div">
                                Match Children to Parent
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                {processingStatus || "Update children to match latest parent version"}
                            </Typography>
                        </div>
                        {loading && <CircularProgress size={20}/>}
                    </CardContent>
                </Card>
{currentChildIndex >= 0 && currentChildIndex < updatedChildren.length && (
                    <ModifyConfirmation
                        open={true}
                        onClose={handleCloseDialog}
                        onAccept={handleAccept}
                        dialogTitle={`Update Child ${currentChildIndex + 1} of ${updatedChildren.length}: ${updatedChildren[currentChildIndex].title}`}
                        comparisonContent={{
                            original: {
                                title: "Current Version",
                                content: originalChildren.find(child => child.title === updatedChildren[currentChildIndex].title)?.content || ""
                            },
                            modified: {
                                title: "Suggested Changes", 
                                content: updatedChildren[currentChildIndex].content
                            }
                        }}
                    />
                )}
            </>
        );
    }
;

interface TitleAndContent {
    title: string;
    content: string;
}

async function processChildWithLLM(parentContent: string, child: TitleAndContent, authToken: string): Promise<TitleAndContent | null> {
    const prompt = `
You are a professional editor. Your task is to update this child node ONLY if there are factual differences with its parent node.

IMPORTANT: Be conservative. DO NOT make unnecessary changes. Only modify the child when there are actual factual inconsistencies or outdated information compared to the parent.
The parent node has other children to cover the missing information.

<parent_content>
${parentContent}
</parent_content>

<current_child title="${child.title}">
${child.content}
</current_child>

Please analyze the parent content and current child, then ONLY suggest updates when:
- There are factual inconsistencies between parent and child
- Information in the child is outdated compared to the parent
- Critical information from the parent is missing in the child

DO NOT change:
- Writing style or tone
- Extra information not present in the parent
- Structure unless absolutely necessary
- Formatting preferences
- Minor wording differences that don't affect meaning

DO NOT REMOVE:
- Any information from the child if it's not mentioned in the parent
- Any existing formatting in the child

<output_format>
The output should be a JSON object with the following format:
{
    "overlap": "<Analysis of what are the overlapped facts between the parent and child>",
    "differences": "<Analysis of what are the differences between the parent and child on the overlapped information>",
    "revise_needed": <true or false indicating whether the child has difference on the overlapped information>,
    "revised_content": "<Revised HTML content for the child node, if the children differs from the parent on the overlapped information>"
}
</output_format>
`;

    const message = new NormalMessage({
        content: prompt,
        author: "user",
        role: "user"
    });

    return await pRetry(async () => {
        const responseRaw = await fetchChatResponse([message.toJson() as any], "o3", authToken);
        const response = JSON.parse(responseRaw)
        const reviseNeeded = response['revise_needed'];
        if (!reviseNeeded) {
            return null; // No revision needed
        }
        const revisedContent = response['revised_content'];

        if (revisedContent.trim() === '""' || revisedContent.trim() === '') {
            return null;
        }

        const content = revisedContent.trim();
        const isValid = EditorNodeTypeM.validateEditorContent(content);
        if (!isValid) {
            throw new Error(`Child content validation failed for title: ${child.title}`);
        }

        return {
            title: child.title,
            content: content
        };
    }, {
        retries: 3,
        onFailedAttempt: (error) => {
            console.warn(`Validation failed on attempt ${error.attemptNumber}:`, error.message);
        }
    });
}

async function getTopDownMatchingChildren(node: NodeM, authToken: string, setProcessingStatus: (status: string) => void): Promise<TitleAndContent[]> {
    const treeM = node.treeM;
    const parentContent = EditorNodeTypeM.getEditorContent(node);
    const childrenNodes = treeM.getChildren(node).filter((n) => n.nodeTypeName() === "EditorNodeType" && n.data()["archived"] !== true);
    
    const childrenContent = childrenNodes.map(child => ({
        title: child.title(),
        content: EditorNodeTypeM.getEditorContent(child)
    }));

    setProcessingStatus(`Processing ${childrenContent.length} children in parallel...`);

    // Process all children in parallel
    const childPromises = childrenContent.map(async (child) => {
        try {
            return await processChildWithLLM(parentContent, child, authToken);
        } catch (error) {
            console.warn(`Failed to process child ${child.title}:`, error);
            return null;
        }
    });

    const results = await Promise.all(childPromises);
    
    // Filter out null results (children that didn't need updates or failed)
    const updatedChildren = results.filter((child): child is TitleAndContent => child !== null);

    return updatedChildren;
}