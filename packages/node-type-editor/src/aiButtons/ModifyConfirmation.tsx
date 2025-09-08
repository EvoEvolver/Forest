import * as React from "react";
import {useEffect, useState, useMemo} from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import {FormControlLabel, Switch} from "@mui/material";
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

interface ConditionalEditorProps {
    comparisonContent: ComparisonContent;
    onContentChange: (content: string) => void;
    onGetContent: (getContent: () => string) => void;
}

const ConditionalEditor: React.FC<ConditionalEditorProps> = ({ comparisonContent, onContentChange, onGetContent }) => {
    const editor = useEditor({
        extensions: makeExtensions(null, null) as any,
        editable: true,
        enableContentCheck: true,
        onContentError: ({disableCollaboration}) => {
            console.error("Content error in ModifyConfirmation editor:", disableCollaboration);
            disableCollaboration();
        },
        onUpdate: ({editor}) => {
            onContentChange(editor.getHTML());
        },
    });

    console.log("editor is made", editor);

    useEffect(() => {
        if (editor && comparisonContent) {
            const editorContent = editor.getHTML();
            if (editorContent !== comparisonContent.modified.content) {
                try {
                    console.log('Setting editor content to modified content.', comparisonContent.modified.content);
                    editor.commands.setContent(comparisonContent.modified.content.trim());
                    onContentChange(comparisonContent.modified.content.trim());
                } catch (error) {
                    console.warn('Failed to set editor content, setting as escaped HTML:', error);
                    const escapedContent = comparisonContent.modified.content
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
                    const fallbackContent = `<p>${escapedContent}</p>`;
                    editor.commands.setContent(fallbackContent);
                    onContentChange(fallbackContent);
                }
            }
        }
    }, [editor, comparisonContent, onContentChange]);

    useEffect(() => {
        if (editor) {
            onGetContent(() => editor.getHTML());
        }
    }, [editor, onGetContent]);

    return <EditorContent editor={editor} />;
};

export const ModifyConfirmation: React.FC<ModifyConfirmationProps> = ({
                                                                          open,
                                                                          onClose,
                                                                          onAccept,
                                                                          dialogTitle,
                                                                          comparisonContent
                                                                      }) => {
    const [showEdit, setShowEdit] = useState(false);
    const [currentContent, setCurrentContent] = useState('');
    const [getEditorContent, setGetEditorContent] = useState<(() => string) | null>(null);

    const diffHtml = useMemo(() => {
        if (!open || !comparisonContent) return '';
        const modifiedContent = currentContent || comparisonContent.modified.content;
        return makeHtmlDiff(comparisonContent.original.content, modifiedContent);
    }, [open, comparisonContent?.original.content, comparisonContent?.modified.content, currentContent]);


    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span>{dialogTitle}</span>
                        <FormControlLabel
                            control={<Switch checked={showEdit} onChange={(e) => setShowEdit(e.target.checked)}/>}
                            label="Edit Mode"
                        />
                    </div>
                </DialogTitle>
                <DialogContent sx={{display: 'flex', flexDirection: 'row', gap: '20px'}}>
                    <div style={{
                        width: '50%',
                        overflow: 'auto',
                        border: '1px solid #ccc',
                        padding: '10px',
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                    }}>
                        <h3>{comparisonContent.original.title}</h3>
                        <div
                            dangerouslySetInnerHTML={{__html: comparisonContent.original.content}}
                            style={{
                                lineHeight: 1.6,
                                width: '100%'
                            }}
                        />
                    </div>
                    <div style={{
                        width: '50%',
                        overflow: 'auto',
                        border: '1px solid #ccc',
                        padding: '10px',
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                    }}>
                        <h3>Changes Preview</h3>
                        {showEdit ? (
                            open && <ConditionalEditor 
                                comparisonContent={comparisonContent}
                                onContentChange={setCurrentContent}
                                onGetContent={setGetEditorContent}
                            />
                        ) : (
                            <span
                                dangerouslySetInnerHTML={{__html: diffHtml}}
                                style={{
                                    lineHeight: 1.6
                                }}
                            />
                        )}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={() => {
                            if (getEditorContent) {
                                const html = getEditorContent();
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