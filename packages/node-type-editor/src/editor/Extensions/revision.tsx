import { Extension} from '@tiptap/core';
import {Plugin, PluginKey, TextSelection} from '@tiptap/pm/state';
import React from 'react';
import { Card, IconButton, Typography } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Declare the commands for the Revision extension
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        revision: {
            /**
             * Toggle revision mode
             */
            toggleRevisionMode: () => ReturnType;
            /**
             * Set revision mode state
             */
            setRevisionMode: (enabled: boolean) => ReturnType;
            /**
             * Check if revision mode is enabled
             */
            isRevisionModeEnabled: () => boolean;
            /**
             * Accept all changes in the current selection
             */
            acceptAllChanges: () => ReturnType;
            /**
             * Reject all changes in the current selection
             */
            rejectAllChanges: () => ReturnType;
        };
    }
}

// Define the options for the extension
interface RevisionOptions {
    enabled: boolean;
    onModeChange?: (enabled: boolean) => void;
}

// Create the Revision Extension
export const RevisionExtension = Extension.create<RevisionOptions>({
    name: 'revision',

    addOptions() {
        return {
            enabled: false,
            onModeChange: undefined,
        };
    },

    addStorage() {
        return {
            revisionMode: this.options.enabled,
        };
    },

    addCommands() {
        return {
            toggleRevisionMode: () => ({ commands }) => {
                const currentMode = this.storage.revisionMode;
                return commands.setRevisionMode(!currentMode);
            },
            
            setRevisionMode: (enabled: boolean) => ({ commands }) => {
                this.storage.revisionMode = enabled;
                
                // Call the callback if provided
                if (this.options.onModeChange) {
                    this.options.onModeChange(enabled);
                }
                
                return true;
            },
            
            isRevisionModeEnabled: () => {
                return this.storage.revisionMode;
            },
            
            acceptAllChanges: () => ({ commands, state, tr }) => {
                const { from, to } = state.selection;
                let transaction = tr;
                
                // Accept all suggest-delete marks in selection
                state.doc.nodesBetween(from, to, (node, pos) => {
                    if (node.marks) {
                        node.marks.forEach((mark) => {
                            if (mark.type.name === 'suggest-delete') {
                                // Remove the mark and delete the content
                                const markFrom = pos;
                                const markTo = pos + node.nodeSize;
                                transaction = transaction.removeMark(markFrom, markTo, mark);
                                transaction = transaction.delete(markFrom, markTo);
                            }
                        });
                    }
                });
                
                // Accept all suggest-insert marks in selection
                state.doc.nodesBetween(from, to, (node, pos) => {
                    if (node.marks) {
                        node.marks.forEach((mark) => {
                            if (mark.type.name === 'suggest-adding') {
                                // Remove the mark, keep the content
                                const markFrom = pos;
                                const markTo = pos + node.nodeSize;
                                transaction = transaction.removeMark(markFrom, markTo, mark);
                            }
                        });
                    }
                });
                
                if (transaction.docChanged) {
                    this.editor.view.dispatch(transaction);
                    return true;
                }
                
                return false;
            },
            
            rejectAllChanges: () => ({ commands, state, tr }) => {
                const { from, to } = state.selection;
                let transaction = tr;
                
                // Reject all suggest-delete marks in selection
                state.doc.nodesBetween(from, to, (node, pos) => {
                    if (node.marks) {
                        node.marks.forEach((mark) => {
                            if (mark.type.name === 'suggest-delete') {
                                // Remove the mark, keep the content
                                const markFrom = pos;
                                const markTo = pos + node.nodeSize;
                                transaction = transaction.removeMark(markFrom, markTo, mark);
                            }
                        });
                    }
                });
                
                // Reject all suggest-insert marks in selection
                state.doc.nodesBetween(from, to, (node, pos) => {
                    if (node.marks) {
                        node.marks.forEach((mark) => {
                            if (mark.type.name === 'suggest-adding') {
                                // Remove the mark and delete the content
                                const markFrom = pos;
                                const markTo = pos + node.nodeSize;
                                transaction = transaction.removeMark(markFrom, markTo, mark);
                                transaction = transaction.delete(markFrom, markTo);
                            }
                        });
                    }
                });
                
                if (transaction.docChanged) {
                    this.editor.view.dispatch(transaction);
                    return true;
                }
                
                return false;
            },
        };
    },

    // Override keymap behavior when revision mode is enabled
    addKeyboardShortcuts() {
        return {
            // Ctrl/Cmd + Shift + R to toggle revision mode
            'Mod-Shift-r': () => {
                return this.editor.commands.toggleRevisionMode();
            },
            
            // When revision mode is enabled, modify delete behavior
            'Backspace': () => {
                if (!this.storage.revisionMode) {
                    return false; // Use default behavior
                }
                
                // In revision mode, mark deletions as suggestions
                const { state } = this.editor;
                const { from, to } = state.selection;
                
                if (from === to) {
                    // Single character deletion - select the character before cursor
                    if (from > 0) {
                        const { tr } = state;
                        const deleteMarkType = state.schema.marks['suggest-delete'];
                        const insertMarkType = state.schema.marks['suggest-adding'];
                        
                        // Check if the character before cursor has an insert mark
                        const $pos = state.doc.resolve(from - 1);
                        const marksAtPos = $pos.marks();
                        const hasInsertMark = marksAtPos.some(mark => mark.type === insertMarkType);
                        
                        if (hasInsertMark) {
                            // Delete the inserted text completely
                            const newTr = tr
                                .delete(from - 1, from)
                                .setSelection(TextSelection.create(tr.doc, from - 1));
                            this.editor.view.dispatch(newTr);
                            return true;
                        } else if (deleteMarkType) {
                            // Add delete mark to the character before cursor
                            const newTr = tr
                                .addMark(from - 1, from, deleteMarkType.create())
                                .setSelection(TextSelection.create(tr.doc, from - 1));
                            this.editor.view.dispatch(newTr);
                            return true;
                        }
                    }
                } else {
                    // Range deletion - handle mixed insert/delete marks in selection
                    const { tr } = state;
                    const deleteMarkType = state.schema.marks['suggest-delete'];
                    const insertMarkType = state.schema.marks['suggest-adding'];
                    let newTr = tr;
                    
                    // Process the selection to handle insert marks differently
                    // We need to process from right to left to avoid position shifts when deleting
                    const ranges = [];
                    state.doc.nodesBetween(from, to, (node, pos) => {
                        if (node.isText && node.marks) {
                            const nodeStart = Math.max(from, pos);
                            const nodeEnd = Math.min(to, pos + node.nodeSize);
                            const hasInsertMark = node.marks.some(mark => mark.type === insertMarkType);
                            ranges.push({ start: nodeStart, end: nodeEnd, hasInsertMark });
                        }
                    });
                    
                    // Process ranges from right to left to avoid position shifts
                    for (let i = ranges.length - 1; i >= 0; i--) {
                        const { start, end, hasInsertMark } = ranges[i];
                        if (hasInsertMark) {
                            // Delete inserted text completely
                            newTr = newTr.delete(start, end);
                        } else if (deleteMarkType) {
                            // Add delete marks to this range
                            newTr = newTr.addMark(start, end, deleteMarkType.create());
                        }
                    }
                    
                    newTr = newTr.setSelection(TextSelection.create(newTr.doc, from));
                    this.editor.view.dispatch(newTr);
                    return true;
                }
                
                return false;
            },
            
            'Delete': () => {
                if (!this.storage.revisionMode) {
                    return false; // Use default behavior
                }
                
                // In revision mode, mark deletions as suggestions
                const { state } = this.editor;
                const { from, to } = state.selection;
                
                if (from === to) {
                    // Single character deletion - mark character after cursor, keep cursor position
                    if (from < state.doc.content.size) {
                        const { tr } = state;
                        const deleteMarkType = state.schema.marks['suggest-delete'];
                        const insertMarkType = state.schema.marks['suggest-adding'];
                        
                        // Check if the character after cursor has an insert mark
                        const $pos = state.doc.resolve(from + 1);
                        const marksAtPos = $pos.marks();
                        const hasInsertMark = marksAtPos.some(mark => mark.type === insertMarkType);
                        
                        if (hasInsertMark) {
                            // Delete the inserted text completely
                            const newTr = tr
                                .delete(from, from + 1)
                                .setSelection(TextSelection.create(tr.doc, from));
                            this.editor.view.dispatch(newTr);
                            return true;
                        } else if (deleteMarkType) {
                            // Add delete mark to the character after cursor
                            const newTr = tr
                                .addMark(from, from + 1, deleteMarkType.create())
                                .setSelection(TextSelection.create(tr.doc, from));
                            this.editor.view.dispatch(newTr);
                            return true;
                        }
                    }
                } else {
                    // Range deletion - handle mixed insert/delete marks in selection (same logic as Backspace)
                    const { tr } = state;
                    const deleteMarkType = state.schema.marks['suggest-delete'];
                    const insertMarkType = state.schema.marks['suggest-adding'];
                    let newTr = tr;
                    
                    // Process the selection to handle insert marks differently
                    // We need to process from right to left to avoid position shifts when deleting
                    const ranges = [];
                    state.doc.nodesBetween(from, to, (node, pos) => {
                        if (node.isText && node.marks) {
                            const nodeStart = Math.max(from, pos);
                            const nodeEnd = Math.min(to, pos + node.nodeSize);
                            const hasInsertMark = node.marks.some(mark => mark.type === insertMarkType);
                            ranges.push({ start: nodeStart, end: nodeEnd, hasInsertMark });
                        }
                    });
                    
                    // Process ranges from right to left to avoid position shifts
                    for (let i = ranges.length - 1; i >= 0; i--) {
                        const { start, end, hasInsertMark } = ranges[i];
                        if (hasInsertMark) {
                            // Delete inserted text completely
                            newTr = newTr.delete(start, end);
                        } else if (deleteMarkType) {
                            // Add delete marks to this range
                            newTr = newTr.addMark(start, end, deleteMarkType.create());
                        }
                    }
                    
                    newTr = newTr.setSelection(TextSelection.create(newTr.doc, from));
                    this.editor.view.dispatch(newTr);
                    return true;
                }
                
                return false;
            },
        };
    },

    // Override input behavior when revision mode is enabled
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('revision-input'),
                props: {
                    handleTextInput: (view, from, to, text) => {
                        if (this.storage.revisionMode) {
                            // In revision mode, mark new text as insertions
                            const tr = view.state.tr;
                            tr.insertText(text, from, to);
                            tr.addMark(from, from + text.length, view.state.schema.marks['suggest-adding'].create());
                            view.dispatch(tr);
                            return true;
                        }
                        return false;
                    },
                },
            }),
        ];
    },
});

/**
 * React component for revision mode indicator
 */
export const RevisionModeIndicator = ({ editor }) => {
    const isRevisionMode = editor?.storage?.revision?.revisionMode || false;
    
    const handleToggle = () => {
        editor?.commands.toggleRevisionMode();
    };
    
    if (!editor) return null;
    
    return (
        <Card sx={{ 
            position: 'fixed', 
            top: 20, 
            right: 20, 
            p: 1, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            backgroundColor: isRevisionMode ? 'warning.light' : 'grey.100',
            zIndex: 1000
        }}>
            <IconButton
                size="small"
                onClick={handleToggle}
                sx={{ color: isRevisionMode ? 'warning.dark' : 'grey.600' }}
            >
                {isRevisionMode ? <EditIcon /> : <VisibilityIcon />}
            </IconButton>
            <Typography variant="caption">
                {isRevisionMode ? 'Revision Mode' : 'View Mode'}
            </Typography>
        </Card>
    );
};