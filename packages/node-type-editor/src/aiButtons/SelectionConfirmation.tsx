import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormGroup from '@mui/material/FormGroup';
import Checkbox from '@mui/material/Checkbox';
import {Box, TextField} from "@mui/material";
import {EditorContent, useEditor} from '@tiptap/react';
import {useEffect, useRef, useState} from "react";
import {makeExtensions} from "../editor";

interface SelectionItem {
    id: string;
    title: string;
    content: string;
}

interface SelectionConfirmationProps {
    open: boolean;
    onClose: () => void;
    onAccept: (modifiedItems: SelectionItem[]) => void;
    dialogTitle: string;
    selectionItems: SelectionItem[];
    selectedItems: Record<string, boolean>;
    onToggleSelection: (id: string) => void;
}

const EditableSelectionItem: React.FC<{
    item: SelectionItem;
    selected: boolean;
    onToggle: () => void;
    onContentChange: (content: string) => void;
    onTitleChange: (title: string) => void;
    open: boolean;
}> = ({ item, selected, onToggle, onContentChange, onTitleChange, open }) => {
    const [title, setTitle] = useState(item.title);
    
    useEffect(() => {
        setTitle(item.title);
    }, [item.title]);
    
    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        onTitleChange(newTitle);
    };
    
    const editor = useEditor({
        extensions: makeExtensions(null, null, null, null, null),
        editable: true,
        enableContentCheck: true,
        onContentError: ({disableCollaboration}) => {
            console.error("Content error in SelectionConfirmation editor:", disableCollaboration);
            disableCollaboration();
        },
        onUpdate: ({ editor }) => {
            onContentChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && item && open) {
            const currentContent = editor.getHTML();
            if (currentContent !== item.content) {
                editor.commands.setContent(item.content);
            }
        }
    }, [editor, item, open]);

    return (
        <div style={{marginBottom: 16}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <Checkbox
                    checked={selected}
                    onChange={onToggle}
                />
                <TextField
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ flexGrow: 1 }}
                />
            </div>
            <Box
                style={{
                    marginLeft: 32,
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '10px',
                    minHeight: '100px'
                }}
            >
                {editor ? (
                    <EditorContent editor={editor} />
                ) : (
                    <div dangerouslySetInnerHTML={{__html: item.content}} />
                )}
            </Box>
        </div>
    );
};

export const SelectionConfirmation: React.FC<SelectionConfirmationProps> = ({
    open,
    onClose,
    onAccept,
    dialogTitle,
    selectionItems,
    selectedItems,
    onToggleSelection
}) => {
    const modifiedItemsRef = useRef<Record<string, string>>({});
    const modifiedTitlesRef = useRef<Record<string, string>>({});

    const handleContentChange = (itemId: string, content: string) => {
        modifiedItemsRef.current[itemId] = content;
    };

    const handleTitleChange = (itemId: string, title: string) => {
        modifiedTitlesRef.current[itemId] = title;
    };

    const handleAccept = () => {
        const updatedItems = selectionItems.map(item => ({
            ...item,
            title: modifiedTitlesRef.current[item.id] || item.title,
            content: modifiedItemsRef.current[item.id] || item.content
        }));
        onAccept(updatedItems);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogContent>
                <p>Select the new children nodes you want to create:</p>
                <FormGroup>
                    {selectionItems.map((item) => (
                        <EditableSelectionItem
                            key={item.id}
                            item={{
                                ...item,
                                title: modifiedTitlesRef.current[item.id] || item.title
                            }}
                            selected={selectedItems[item.id] ?? true}
                            onToggle={() => onToggleSelection(item.id)}
                            onContentChange={(content) => handleContentChange(item.id, content)}
                            onTitleChange={(title) => handleTitleChange(item.id, title)}
                            open={open}
                        />
                    ))}
                </FormGroup>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleAccept} color="primary">Accept</Button>
            </DialogActions>
        </Dialog>
    );
};