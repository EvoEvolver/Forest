import * as React from "react";
import {useEffect, useMemo, useState} from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import {Switch, FormControlLabel} from "@mui/material";
import {EditorContent, useEditor} from '@tiptap/react';
import {makeExtensions} from "../editor";
import {makeHtmlDiff} from "./helper";


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
    const [showDiff, setShowDiff] = useState(false);
    
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
        const diff = makeHtmlDiff(comparisonContent.original.content, comparisonContent.modified.content);

        // Check if diffHtml is surrounded by <p> tags, if not, add them
        const trimmedDiff = diff.trim();
        if (!trimmedDiff.startsWith('<p>') || !trimmedDiff.endsWith('</p>')) {
            return `<p>${trimmedDiff}</p>`;
        }

        return diff;
    }, [comparisonContent]);

    useEffect(() => {
        if (editor && comparisonContent && open) {
            const currentContent = editor.getHTML();
            if (currentContent !== comparisonContent.modified.content) {
                try {
                    editor.commands.setContent(comparisonContent.modified.content);
                } catch (error) {
                    console.warn('Failed to set editor content, setting as escaped HTML:', error);
                    const escapedContent = comparisonContent.modified.content
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
                    editor.commands.setContent(`<p>${escapedContent}</p>`);
                }
            }
        }
    }, [editor, comparisonContent, open]);

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span>{dialogTitle}</span>
                        <FormControlLabel
                            control={<Switch checked={showDiff} onChange={(e) => setShowDiff(e.target.checked)} />}
                            label="Show Diff"
                        />
                    </div>
                </DialogTitle>
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
                    }}>
                        <h3>Changes Preview (Editable)</h3>
                        {showDiff ? (
                            <span
                                dangerouslySetInnerHTML={{__html: diffHtml}}
                                style={{
                                    lineHeight: 1.6
                                }}
                            />
                        ) : (
                            <EditorContent editor={editor} key={editor?.storage?.html || 'editor'}/>
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