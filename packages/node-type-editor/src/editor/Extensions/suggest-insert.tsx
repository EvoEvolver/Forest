import React from "react";
import {Mark} from "@tiptap/core";
import {Card, IconButton} from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

// 1. Declare the commands for the SuggestInsert extension
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        suggestInsert: {
            /**
             * Set a suggest-adding mark
             */
            setSuggestInsert: () => ReturnType;
            /**
             * Unset a suggest-adding mark
             */
            unsetSuggestInsert: () => ReturnType;
            /**
             * Accept a suggest-adding mark
             */
            acceptSuggestInsert: () => ReturnType;
            /**
             * Display suggest-adding hover menu
             */
            displaySuggestInsert: (options?: any) => ReturnType;
        };
    }
}

// 2. Define the options for the extension
interface SuggestInsertOptions {
    HTMLAttributes: Record<string, any>;
}

// 3. Create the SuggestInsert Extension
export const SuggestInsertExtension = Mark.create<SuggestInsertOptions>({
    name: "suggest-adding",

    // A suggest-adding mark can coexist with other marks
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
                tag: "ins",
            },
        ];
    },

    // 6. Define how the mark is rendered to HTML
    renderHTML() {
        return [
            "ins",
            {},
            0,
        ];
    },

    // 7. Add commands to set, unset, and accept the suggest-adding mark
    addCommands() {
        return {
            displaySuggestInsert: (options) => ({commands}) => {
                const setHoverElements = (this.editor as any).options?.setHoverElements;
                if (!setHoverElements) {
                    return true;
                }
                const _options = options || {};

                // Find the DOM element corresponding to the suggest-adding mark at current position
                const {from, to} = this.editor.state.selection;
                const {$from} = this.editor.state.selection;
                const suggestInsertMark = this.editor.schema.marks['suggest-adding'];
                const marks = $from.marks();

                // Check if there's a suggest-adding mark at current position
                let hasSuggestInsertMark = marks.find((mark: any) => mark.type === suggestInsertMark);

                // If no suggest-adding mark at current position, check surrounding marks
                if (!hasSuggestInsertMark) {
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

                    // Look for suggest-adding mark in surrounding marks
                    hasSuggestInsertMark = surroundingMarks.find((mark: any) => mark.type === suggestInsertMark);
                }

                // If no suggest-adding mark is active, clear hover elements
                if (!hasSuggestInsertMark) {
                    setHoverElements((prev: any) => {
                        return prev.filter((el: any) => el.source !== "suggest-adding");
                    });
                    return true;
                }

                // Try to find the suggest-adding element at the current selection
                let el = null;

                // First, try to find the element at the cursor position
                const domNode = this.editor.view.domAtPos(from).node;
                let candidateEl = domNode.nodeType === Node.TEXT_NODE ? domNode.parentElement : domNode as HTMLElement;

                // Check if we found the right ins tag
                if (candidateEl && candidateEl.tagName === 'INS') {
                    el = candidateEl;
                } else {
                    // If not found, search within the selection range for any suggest-adding ins tag
                    for (let pos = from; pos <= to; pos++) {
                        try {
                            const nodeAtPos = this.editor.view.domAtPos(pos).node;
                            const elementAtPos = nodeAtPos.nodeType === Node.TEXT_NODE ? nodeAtPos.parentElement : nodeAtPos as HTMLElement;

                            if (elementAtPos && elementAtPos.tagName === 'INS') {
                                el = elementAtPos;
                                break;
                            }

                            // Also check parent elements
                            let parent = elementAtPos?.parentElement;
                            while (parent && parent !== this.editor.view.dom) {
                                if (parent.tagName === 'INS') {
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
                        const foundEl = this.editor.view.dom.querySelector('ins');
                        if (foundEl) {
                            el = foundEl;
                        }
                    }
                }

                if (!el) {
                    setHoverElements((prev: any) => {
                        return prev.filter((el: any) => el.source !== "suggest-adding");
                    });
                    return true;
                }

                // Create the hover element object to be rendered
                const hoverElement = {
                    source: 'suggest-adding',
                    el: el,
                    render: (el: any, editor: any) => (
                        <SuggestInsertHover
                            hoveredEl={el}
                            editor={editor}
                            options={{..._options}}
                        />
                    )
                };
                setHoverElements((prev: any) => {
                    const filtered = prev.filter((el: any) => el.source !== "suggest-adding");
                    return [...filtered, hoverElement];
                });
                return true;
            },
            setSuggestInsert: () => ({commands}) => {
                return commands.setMark(this.name);
            },
            unsetSuggestInsert: () => ({commands}) => {
                return commands.unsetMark(this.name);
            },
            acceptSuggestInsert: () => ({commands}) => {
                return commands.unsetMark(this.name);
            },
        };
    },

    // 8. Track selection updates to show/hide the hover menu
    onSelectionUpdate() {
        this.editor.commands.displaySuggestInsert({inputOn: false});
    },
});

/**
 * React component for the SuggestInsert hover/bubble menu.
 */
export const SuggestInsertHover = ({hoveredEl, editor, options}) => {
    // Handler to accept the suggestion (remove the mark)
    const handleAccept = () => {
        editor.chain().focus().extendMarkRange('suggest-adding').acceptSuggestInsert().run();
    };

    // Handler to reject the suggestion (remove the text and mark)
    const handleReject = () => {
        editor.chain().focus().extendMarkRange('suggest-adding').deleteSelection().run();
    };

    return (
        <Card sx={{width: 'fit-content', p: 0.5, display: 'flex', alignItems: 'center', gap: 0.5}}>
            <IconButton
                size="small"
                onClick={handleAccept}
                title="Accept suggestion"
                sx={{color: 'success.main'}}
            >
                <CheckIcon fontSize="inherit"/>
            </IconButton>
            <IconButton
                size="small"
                onClick={handleReject}
                title="Reject suggestion"
                sx={{color: 'error.main'}}
            >
                <CloseIcon fontSize="inherit"/>
            </IconButton>
        </Card>
    );
};

