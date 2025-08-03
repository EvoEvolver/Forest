import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import {EditorContent, useEditor} from '@tiptap/react';
import {useEffect} from "react";
import {makeExtensions} from "../editor";


interface ComparisonContent {
    original: {
        title: string;
        content: string;
    };
    modified: {
        title: string;
        content: string;
    };
}

interface ModifyConfirmationProps {
    open: boolean;
    onClose: () => void;
    onAccept: (modifiedContent: string) => void;
    dialogTitle: string;
    comparisonContent: ComparisonContent;
}

export const ModifyConfirmation: React.FC<ModifyConfirmationProps> = ({
    open,
    onClose,
    onAccept,
    dialogTitle,
    comparisonContent
}) => {
    const editor = useEditor({
        extensions: makeExtensions(null, null, null, null, null),
        editable: true,
        enableContentCheck: true,
        onContentError: ({disableCollaboration}) => {
            console.error("Content error in ModifyConfirmation editor:", disableCollaboration);
            disableCollaboration();
        },
    });

    useEffect(() => {
        if (editor && comparisonContent && open) {
            const currentContent = editor.getHTML();
            if (currentContent !== comparisonContent.modified.content) {
                editor.commands.setContent(comparisonContent.modified.content);
            }
        }
    }, [editor, comparisonContent, open]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogContent sx={{display: 'flex', gap: '20px'}}>
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    border: '1px solid #ccc',
                    padding: '10px',
                    borderRadius: '4px'
                }}>
                    <h3>{comparisonContent.original.title}</h3>
                    <div dangerouslySetInnerHTML={{ __html: comparisonContent.original.content }} />
                </div>
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    border: '1px solid #ccc',
                    padding: '10px',
                    borderRadius: '4px'
                }}>
                    <h3>{comparisonContent.modified.title}</h3>
                    {editor ? (
                        <EditorContent editor={editor} key={editor?.storage?.html || 'editor'} />
                    ) : (
                        <div dangerouslySetInnerHTML={{ __html: comparisonContent.modified.content }} />
                    )}
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button 
                    onClick={() => {
                        if (editor) {
                            const html = editor.getHTML();
                            onAccept(html);
                        } else {
                            onAccept(comparisonContent.modified.content);
                        }
                    }} 
                    color="primary"
                >
                    Accept
                </Button>
            </DialogActions>
        </Dialog>
    );
};