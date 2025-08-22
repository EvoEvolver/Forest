import React from "react";
import {Mark, mergeAttributes} from "@tiptap/core";
import {Card, IconButton} from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

// 1. Declare the commands for the SuggestAdding extension
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        suggestAdding: {
            /**
             * Set a suggest-adding mark
             */
            setSuggestAdding: () => ReturnType;
            /**
             * Unset a suggest-adding mark
             */
            unsetSuggestAdding: () => ReturnType;
            /**
             * Accept a suggest-adding mark
             */
            acceptSuggestAdding: () => ReturnType;
            /**
             * Display suggest-adding hover menu
             */
            displaySuggestAdding: ({id}: { id: string }, options) => ReturnType;
        };
    }
}

// 2. Define the options for the extension
interface SuggestAddingOptions {
    HTMLAttributes: Record<string, any>;
}

// 3. Create the SuggestAdding Extension
export const SuggestAddingExtension = Mark.create<SuggestAddingOptions>({
    name: "suggest-adding",

    // A suggest-adding mark can coexist with other marks
    inclusive: false,
    exclusive: false,

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'editor-suggest-adding',
                style: 'background-color: #c8e6c9; padding: 1px 2px; border-radius: 2px;',
            },
        };
    },

    // 4. Add attributes to the mark
    addAttributes() {
        return {
            id: {
                default: null,
            },
        };
    },

    // 5. Define how the mark is parsed from HTML
    parseHTML() {
        return [
            {
                tag: "span[data-suggest-adding]",
                getAttrs: (el) => {
                    const id = (el as HTMLSpanElement).getAttribute("data-suggest-adding");
                    return id ? {id} : false;
                }
            },
        ];
    },

    // 6. Define how the mark is rendered to HTML
    renderHTML({HTMLAttributes}) {
        return [
            "span",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                "data-suggest-adding": HTMLAttributes.id || "true"
            }),
            0,
        ];
    },

    // 7. Add commands to set, unset, and accept the suggest-adding mark
    addCommands() {
        return {
            displaySuggestAdding: (props, options) => ({commands}) => {
                const setHoverElements = (this.editor as any).options?.setHoverElements;
                if (!setHoverElements) {
                    return true;
                }
                const _options = options || {};
                const {id} = props;
                // If id is null, it means no suggest-adding is active, so we clear the hover elements
                if (!id) {
                    setHoverElements((prev: any) => {
                        return prev.filter((el: any) => el.source !== "suggest-adding");
                    });
                    return true;
                }

                // Find the DOM element corresponding to the active suggest-adding mark
                const {from, to} = this.editor.state.selection;

                // Try to find the suggest-adding element at the current selection
                let el = null;

                // First, try to find the element at the cursor position
                const domNode = this.editor.view.domAtPos(from).node;
                let candidateEl = domNode.nodeType === Node.TEXT_NODE ? domNode.parentElement : domNode as HTMLElement;

                // Check if we found the right span tag with suggest-adding attribute
                if (candidateEl && candidateEl.tagName === 'SPAN' && candidateEl.hasAttribute('data-suggest-adding')) {
                    el = candidateEl;
                } else {
                    // If not found, search within the selection range for any suggest-adding span tag
                    for (let pos = from; pos <= to; pos++) {
                        try {
                            const nodeAtPos = this.editor.view.domAtPos(pos).node;
                            const elementAtPos = nodeAtPos.nodeType === Node.TEXT_NODE ? nodeAtPos.parentElement : nodeAtPos as HTMLElement;

                            if (elementAtPos && elementAtPos.tagName === 'SPAN' && elementAtPos.hasAttribute('data-suggest-adding')) {
                                el = elementAtPos;
                                break;
                            }

                            // Also check parent elements
                            let parent = elementAtPos?.parentElement;
                            while (parent && parent !== this.editor.view.dom) {
                                if (parent.tagName === 'SPAN' && parent.hasAttribute('data-suggest-adding')) {
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
                        const foundEl = this.editor.view.dom.querySelector('span[data-suggest-adding]');
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
                        <SuggestAddingHover
                            hoveredEl={el}
                            editor={editor}
                            options={{..._options}}
                        />
                    )
                };
                setHoverElements([hoverElement]);
                return true;
            },
            setSuggestAdding: () => ({commands}) => {
                const id = `suggest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                return commands.setMark(this.name, {id});
            },
            unsetSuggestAdding: () => ({commands}) => {
                return commands.unsetMark(this.name);
            },
            acceptSuggestAdding: () => ({commands}) => {
                return commands.unsetMark(this.name);
            },
        };
    },

    // 8. Track selection updates to show/hide the hover menu
    onSelectionUpdate() {
        const {$from} = this.editor.state.selection;
        const suggestAddingMark = this.editor.schema.marks['suggest-adding'];
        const marks = $from.marks();

        // First check marks at current position
        let activeSuggestAddingMark = marks.find((mark: any) => mark.type === suggestAddingMark);

        // If no suggest-adding mark at current position, check surrounding marks
        if (!activeSuggestAddingMark) {
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
            activeSuggestAddingMark = surroundingMarks.find((mark: any) => mark.type === suggestAddingMark);
        }

        // Find the active suggest-adding mark's id
        const activeId = activeSuggestAddingMark?.attrs.id || null;
        this.editor.commands.displaySuggestAdding({id: activeId}, {inputOn: false});
    },
});

/**
 * React component for the SuggestAdding hover/bubble menu.
 */
export const SuggestAddingHover = ({hoveredEl, editor, options}) => {
    // Handler to accept the suggestion (remove the mark)
    const handleAccept = () => {
        editor.chain().focus().extendMarkRange('suggest-adding').acceptSuggestAdding().run();
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

