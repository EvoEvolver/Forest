import * as React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import {NodeM, NodeVM} from "@forest/schema";
import {EditorNodeTypeM} from "..";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {Card} from "@mui/material";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import SummarizeIcon from '@mui/icons-material/Summarize';
import {ModifyConfirmation} from "./ModifyConfirmation";
import pRetry from 'p-retry';
import {extractExportContent, removeExportContent} from "../editor/Extensions/exportHelpers";


export const BottomUpButton: React.FC<{ node: NodeVM }> = ({node}) => {
    const [loading, setLoading] = React.useState(false);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [originalContent, setOriginalContent] = React.useState<string | null>(null);
    const [revisedContent, setRevisedContent] = React.useState<string | null>(null);
    const [exportContent, setExportContent] = React.useState<string>('');
    const authToken = useAtomValue(authTokenAtom)

    const handleClick = async () => {
        setLoading(true);
        try {
            const fullContent = EditorNodeTypeM.getEditorContent(node.nodeM);
            const original = removeExportContent(fullContent);
            const exports = extractExportContent(fullContent);
            const revised = await getBottomUpRevisedContent(node.nodeM, authToken);

            setOriginalContent(original);
            setExportContent(exports);
            setRevisedContent(revised);
            setDialogOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setOriginalContent(null);
        setRevisedContent(null);
        setExportContent('');
    };

    const handleAccept = async (modifiedContent: string) => {
        await stageThisVersion(node.nodeM, "Before bottom-up editing");
        try {
            // Combine the modified content with the preserved export content
            const finalContent = exportContent 
                ? modifiedContent + `<div class="export">${exportContent}</div>`
                : modifiedContent;
            
            EditorNodeTypeM.setEditorContent(node.nodeM, finalContent);
        }catch (e) {
            alert(e)
        }
        handleCloseDialog();
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
                    <SummarizeIcon color="primary"/>
                    <div>
                        <Typography variant="body1" component="div">
                            Summerize from children
                        </Typography>
                    </div>
                    {loading && <CircularProgress size={20}/>}
                </CardContent>
            </Card>

            <ModifyConfirmation
                open={dialogOpen}
                onClose={handleCloseDialog}
                onAccept={handleAccept}
                dialogTitle="Review Changes"
                comparisonContent={{
                    original: {
                        title: "Original",
                        content: originalContent ?? ""
                    },
                    modified: {
                        title: "Revised",
                        content: revisedContent ?? ""
                    }
                }}
            />
        </>
    );
};

async function getBottomUpRevisedContent(node: NodeM, authToken): Promise<string> {
    const treeM = node.treeM;
    const children = treeM.getChildren(node).filter((n) => n.nodeTypeName() === "EditorNodeType" && n.data()["archived"] !== true);
    const childrenContent = children.map(child => "# " + child.title() + "\n" + EditorNodeTypeM.getEditorContent(child)).join("\n");
    const originalContent = removeExportContent(EditorNodeTypeM.getEditorContent(node));
    const prompt = `You are a professional editor. The given original text is a summary of some children contents. 
Your task is to revise the original context to make it serve as a better summary of the children contents.
<original_content>
${originalContent}
</original_content>
<children_contents>
${childrenContent}
</children_contents>
Please provide an updated version of the original text in key points. You should not make unnecessary changes to the original text.
<output_format>
You should only return the HTML content of the revised text without any additional text or formatting.
You are required to make a list of key points by <ul></ul>
You should make no more than 5 key points. Each key point should be less than 20 words.
If there are any annotations in the original text, you should keep them as they are.
</output_format>
`;
    const message = new NormalMessage(
        {
            content: prompt,
            author: "user",
            role: "user"
        }
    )

    return await pRetry(async () => {
        const response = await fetchChatResponse([message.toJson() as any], "gpt-4.1", authToken);
        const isValid = EditorNodeTypeM.validateEditorContent(response);
        if (!isValid) {
            throw new Error('Editor content validation failed');
        }
        return response;
    }, {
        retries: 3,
        onFailedAttempt: (error) => {
            console.warn(`Validation failed on attempt ${error.attemptNumber}:`, error.message);
        }
    });
}