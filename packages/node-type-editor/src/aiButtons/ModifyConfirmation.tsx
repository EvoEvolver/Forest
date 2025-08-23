import * as React from "react";
import {useEffect, useMemo} from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import {EditorContent, useEditor} from '@tiptap/react';
import {makeExtensions} from "../editor";
import HtmlDiff from 'htmldiff-js';


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
        extensions: makeExtensions(null, null),
        editable: true,
        enableContentCheck: true,
        onContentError: ({disableCollaboration}) => {
            console.error("Content error in ModifyConfirmation editor:", disableCollaboration);
            disableCollaboration();
        },
    });

    const diffHtml = useMemo(() => {
        if (!comparisonContent) return '';
        return HtmlDiff.execute(comparisonContent.original.content, comparisonContent.modified.content);
    }, [comparisonContent]);

    useEffect(() => {
        if (editor && comparisonContent && open) {
            const currentContent = editor.getHTML();
            if (currentContent !== diffHtml) {
                editor.commands.setContent(diffHtml);
            }
        }
    }, [editor, comparisonContent, open, diffHtml]);

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogContent sx={{display: 'flex', flexDirection: 'row', gap: '20px'}}>
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        border: '1px solid #ccc',
                        padding: '10px',
                        borderRadius: '4px'
                    }}>
                        <h3>{comparisonContent.original.title}</h3>
                        <div
                            dangerouslySetInnerHTML={{__html: comparisonContent.original.content}}
                            style={{
                                lineHeight: 1.6
                            }}
                        />
                    </div>
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        border: '1px solid #ccc',
                        padding: '10px',
                        borderRadius: '4px'
                    }}
                         className="diff-content">
                        <h3>Changes Preview (Editable)</h3>
                        {editor ? (
                            <EditorContent editor={editor} key={editor?.storage?.html || 'editor'}/>
                        ) : (
                            <div dangerouslySetInnerHTML={{__html: diffHtml}}/>
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
        </>
    );
};