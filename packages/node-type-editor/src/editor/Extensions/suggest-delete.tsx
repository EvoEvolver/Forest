import {Mark} from "@tiptap/core";
import React from "react";
import {Card, IconButton} from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

// 1. Declare the commands for the SuggestDelete extension
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        suggestDelete: {
            /**
             * Set a suggest-delete mark
             */
            setSuggestDelete: () => ReturnType;
            /**
             * Unset a suggest-delete mark
             */
            unsetSuggestDelete: () => ReturnType;
            /**
             * Accept a suggest-delete mark
             */
            acceptSuggestDelete: () => ReturnType;
            /**
             * Display suggest-delete hover menu
             */
            displaySuggestDelete: (options?: any) => ReturnType;
        };
    }
}

// 2. Define the options for the extension
interface SuggestDeleteOptions {
    HTMLAttributes: Record<string, any>;
}

// 3. Create the SuggestDelete Extension
export const SuggestDeleteExtension = Mark.create<SuggestDeleteOptions>({
    name: "suggest-delete",

    // A suggest-delete mark can coexist with other marks
    inclusive: false,
    exclusive: false,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    // 4. Add attributes to the mark (none needed for position-based approach)
    addAttributes() {
        return {};
    },

    // 5. Define how the mark is parsed from HTML
    parseHTML() {
        return [
            {
                tag: "del",
            },
        ];
    },

    // 6. Define how the mark is rendered to HTML
    renderHTML() {
        return [
            "del",
            {},
            0,
        ];
    },

    // 7. Add commands to set, unset, and accept the suggest-delete mark
    addCommands() {
        return {
            displaySuggestDelete: (options) => ({commands}) => {
                const setHoverElements = (this.editor as any).options?.setHoverElements;
                if (!setHoverElements) {
                    return true;
                }
                const _options = options || {};

                // Find the DOM element corresponding to the suggest-delete mark at current position
                const {from, to} = this.editor.state.selection;
                const {$from} = this.editor.state.selection;
                const suggestDeleteMark = this.editor.schema.marks['suggest-delete'];
                const marks = $from.marks();

                // Check if there's a suggest-delete mark at current position
                let hasSuggestDeleteMark = marks.find((mark: any) => mark.type === suggestDeleteMark);

                // If no suggest-delete mark at current position, check surrounding marks
                if (!hasSuggestDeleteMark) {
                    let surroundingMarks = [];

                    // Check node before cursor
                    const nodeBefore = $from.nodeBefore;
                    if (nodeBefore) {
                        surroundingMarks = surroundingMarks.concat(nodeBefore.marks);
                    }

                    // Check node after cursor
                    const nodeAfter = $from.nodeAfter;
                    if (nodeAfter) {
                        surroundingMarks = surroundingMarks.concat(nodeAfter.marks);
                    }

                    // Look for suggest-delete mark in surrounding marks
                    hasSuggestDeleteMark = surroundingMarks.find((mark: any) => mark.type === suggestDeleteMark);
                }

                // If no suggest-delete mark is active, clear hover elements
                if (!hasSuggestDeleteMark) {
                    setHoverElements((prev: any) => {
                        return prev.filter((el: any) => el.source !== "suggest-delete");
                    });
                    return true;
                }

                // Try to find the suggest-delete element at the current selection
                let el = null;

                // First, try to find the element at the cursor position
                const domNode = this.editor.view.domAtPos(from).node;
                let candidateEl = domNode.nodeType === Node.TEXT_NODE ? domNode.parentElement : domNode as HTMLElement;

                // Check if we found the right del tag
                if (candidateEl && candidateEl.tagName === 'DEL') {
                    el = candidateEl;
                } else {
                    // If not found, search within the selection range for any suggest-delete del tag
                    for (let pos = from; pos <= to; pos++) {
                        try {
                            const nodeAtPos = this.editor.view.domAtPos(pos).node;
                            const elementAtPos = nodeAtPos.nodeType === Node.TEXT_NODE ? nodeAtPos.parentElement : nodeAtPos as HTMLElement;

                            if (elementAtPos && elementAtPos.tagName === 'DEL') {
                                el = elementAtPos;
                                break;
                            }

                            // Also check parent elements
                            let parent = elementAtPos?.parentElement;
                            while (parent && parent !== this.editor.view.dom) {
                                if (parent.tagName === 'DEL') {
                                    el = parent;
                                    break;
                                }
                                parent = parent.parentElement;
                            }

                            if (el) break;
                        } catch (e) {
                            // Continue searching if position is invalid
                        }
                    }

                    // Final fallback: query the DOM
                    if (!el) {
                        const foundEl = this.editor.view.dom.querySelector('del');
                        if (foundEl) {
                            el = foundEl;
                        }
                    }
                }

                if (!el) {
                    setHoverElements((prev: any) => {
                        return prev.filter((el: any) => el.source !== "suggest-delete");
                    });
                    return true;
                }

                // Create the hover element object to be rendered
                const hoverElement = {
                    source: 'suggest-delete',
                    el: el,
                    render: (el: any, editor: any) => (
                        <SuggestDeleteHover
                            hoveredEl={el}
                            editor={editor}
                            options={{..._options}}
                        />
                    )
                };
                setHoverElements((prev: any) => {
                    const filtered = prev.filter((el: any) => el.source !== "suggest-delete");
                    return [...filtered, hoverElement];
                });
                return true;
            },
            setSuggestDelete: () => ({commands}) => {
                return commands.setMark(this.name);
            },
            unsetSuggestDelete: () => ({commands}) => {
                return commands.unsetMark(this.name);
            },
            acceptSuggestDelete: () => ({commands, chain}) => {
                return chain().extendMarkRange(this.name).deleteSelection().run();
            },
        };
    },

    // 8. Track selection updates to show/hide the hover menu
    onSelectionUpdate() {
        this.editor.commands.displaySuggestDelete({inputOn: false});
    },
});

/**
 * React component for the SuggestDelete hover/bubble menu.
 */
export const SuggestDeleteHover = ({hoveredEl, editor, options}) => {
    // Handler to accept the suggestion (delete the text)
    const handleAccept = () => {
        editor.chain().focus().extendMarkRange('suggest-delete').acceptSuggestDelete().run();
    };

    // Handler to reject the suggestion (remove only the mark, keep the text)
    const handleReject = () => {
        editor.chain().focus().extendMarkRange('suggest-delete').unsetSuggestDelete().run();
    };

    return (
        <Card sx={{width: 'fit-content', p: 0.5, display: 'flex', alignItems: 'center', gap: 0.5}}>
            <IconButton
                size="small"
                onClick={handleAccept}
                title="Accept deletion"
                sx={{color: 'success.main'}}
            >
                <CheckIcon fontSize="inherit"/>
            </IconButton>
            <IconButton
                size="small"
                onClick={handleReject}
                title="Reject deletion"
                sx={{color: 'error.main'}}
            >
                <CloseIcon fontSize="inherit"/>
            </IconButton>
        </Card>
    );
};

