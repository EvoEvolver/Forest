import React from "react";
import { Node } from "@tiptap/core";
import { Card, IconButton } from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

// 1. Declare the commands for the NodeDiff extension
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        nodeDiff: {
            /**
             * Set a node as inserted
             */
            setNodeInsert: () => ReturnType;
            /**
             * Set a node as deleted
             */
            setNodeDelete: () => ReturnType;
            /**
             * Unset node diff
             */
            unsetNodeDiff: () => ReturnType;
            /**
             * Accept a node diff
             */
            acceptNodeDiff: () => ReturnType;
            /**
             * Display node diff hover menu
             */
            displayNodeDiff: (options?: any) => ReturnType;
        };
    }
}

// 2. Define the options for the extension
interface NodeDiffOptions {
    HTMLAttributes: Record<string, any>;
}

// 3. Create the NodeDiff Extension
export const NodeDiffExtension = Node.create<NodeDiffOptions>({
    name: "node-diff",

    group: "block",
    content: "block+",
    defining: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    // 4. Add attributes to store diff type
    addAttributes() {
        return {
            diffType: {
                default: null,
                parseHTML: element => {
                    if (element.classList.contains('insert')) return 'insert';
                    if (element.classList.contains('delete')) return 'delete';
                    return null;
                },
                renderHTML: attributes => {
                    if (!attributes.diffType) return {};
                    return {
                        class: attributes.diffType,
                    };
                },
            },
        };
    },

    // 5. Define how the node is parsed from HTML
    parseHTML() {
        return [
            {
                tag: "div.insert",
                attrs: { diffType: 'insert' },
            },
            {
                tag: "div.delete",
                attrs: { diffType: 'delete' },
            },
        ];
    },

    // 6. Define how the node is rendered to HTML
    renderHTML({ HTMLAttributes, node }) {
        const diffType = node.attrs.diffType;
        const className = diffType ? diffType : '';
        
        return [
            "div",
            {
                ...HTMLAttributes,
                class: className,
            },
            0,
        ];
    },

    // 7. Add commands to set, unset, and accept the node diff
    addCommands() {
        return {
            displayNodeDiff: (options) => ({ commands }) => {
                const setHoverElements = (this.editor as any).options?.setHoverElements;
                if (!setHoverElements) {
                    return true;
                }
                const _options = options || {};

                // Find the current node
                const { from, to } = this.editor.state.selection;
                const { $from } = this.editor.state.selection;
                
                // Find parent node with diff attributes
                let diffNode = null;
                let pos = from;
                
                while (pos >= 0 && !diffNode) {
                    const resolvedPos = this.editor.state.doc.resolve(pos);
                    const node = resolvedPos.parent;
                    
                    if (node && node.type.name === 'node-diff' && node.attrs.diffType) {
                        diffNode = node;
                        break;
                    }
                    
                    pos = resolvedPos.start() - 1;
                }

                // If no diff node found, clear hover elements
                if (!diffNode) {
                    setHoverElements((prev: any) => {
                        return prev.filter((el: any) => el.source !== "node-diff");
                    });
                    return true;
                }

                // Find the DOM element for this node
                let el = null;
                try {
                    const domNode = this.editor.view.domAtPos(from).node;
                    let candidateEl = domNode.nodeType === Node.TEXT_NODE ? domNode.parentElement : domNode as HTMLElement;

                    // Search up the DOM tree for the div with insert/delete class
                    while (candidateEl && candidateEl !== this.editor.view.dom) {
                        if (candidateEl.tagName === 'DIV' && 
                            (candidateEl.classList.contains('insert') || candidateEl.classList.contains('delete'))) {
                            el = candidateEl;
                            break;
                        }
                        candidateEl = candidateEl.parentElement;
                    }

                    // Fallback: query for any diff node
                    if (!el) {
                        const foundEl = this.editor.view.dom.querySelector('div.insert, div.delete');
                        if (foundEl) {
                            el = foundEl;
                        }
                    }
                } catch (e) {
                    // Handle error
                }

                if (!el) {
                    setHoverElements((prev: any) => {
                        return prev.filter((el: any) => el.source !== "node-diff");
                    });
                    return true;
                }

                // Create the hover element object to be rendered
                const hoverElement = {
                    source: 'node-diff',
                    el: el,
                    render: (el: any, editor: any) => (
                        <NodeDiffHover
                            hoveredEl={el}
                            editor={editor}
                            diffType={diffNode.attrs.diffType}
                            options={{ ..._options }}
                        />
                    )
                };

                setHoverElements((prev: any) => {
                    const filtered = prev.filter((el: any) => el.source !== "node-diff");
                    return [...filtered, hoverElement];
                });
                return true;
            },
            setNodeInsert: () => ({ commands }) => {
                const { from, to } = this.editor.state.selection;
                return commands.wrapIn('node-diff', { diffType: 'insert' });
            },
            setNodeDelete: () => ({ commands }) => {
                const { from, to } = this.editor.state.selection;
                return commands.wrapIn('node-diff', { diffType: 'delete' });
            },
            unsetNodeDiff: () => ({ commands }) => {
                return commands.lift('node-diff');
            },
            acceptNodeDiff: () => ({ commands, tr }) => {
                const { from } = this.editor.state.selection;
                const { $from } = this.editor.state.selection;
                const nodeDiffType = this.editor.schema.nodes['node-diff'];
                const nodesToProcess: Array<{pos: number, node: any, diffType: string}> = [];
                
                // Find all ancestor node-diff nodes
                for (let depth = $from.depth; depth >= 0; depth--) {
                    const node = $from.node(depth);
                    if (node.type === nodeDiffType && node.attrs.diffType) {
                        const pos = depth === 0 ? 0 : $from.start(depth) - 1;
                        nodesToProcess.push({
                            pos,
                            node,
                            diffType: node.attrs.diffType
                        });
                    }
                }
                
                // Process nodes from outermost to innermost (reverse order)
                nodesToProcess.reverse().forEach(({ pos, node, diffType }) => {
                    if (diffType === 'delete') {
                        // For delete nodes, remove the entire node
                        const nodeEnd = pos + node.nodeSize;
                        tr.delete(pos, nodeEnd);
                    } else if (diffType === 'insert') {
                        // For insert nodes, unwrap (remove the diff wrapper but keep content)
                        const nodeStart = pos + 1; // Inside the wrapper
                        const nodeEnd = pos + node.nodeSize - 1; // Before the wrapper end
                        
                        if (nodeEnd > nodeStart) {
                            const content = tr.doc.slice(nodeStart, nodeEnd);
                            tr.delete(pos, pos + node.nodeSize);
                            tr.insert(pos, content.content);
                        } else {
                            // Empty node, just delete it
                            tr.delete(pos, pos + node.nodeSize);
                        }
                    }
                });
                
                return true;
            },
        };
    },

    // 8. Track selection updates to show/hide the hover menu
    onSelectionUpdate() {
        this.editor.commands.displayNodeDiff({ inputOn: false });
    },
});

/**
 * React component for the NodeDiff hover/bubble menu.
 */
export const NodeDiffHover = ({ hoveredEl, editor, diffType, options }) => {
    // Handler to accept the diff
    const handleAccept = () => {
        editor.commands.acceptNodeDiff();
    };

    // Handler to reject the diff
    const handleReject = () => {
        if (diffType === 'insert') {
            // For inserts, reject means delete
            editor.commands.deleteNode('node-diff');
        } else {
            // For deletes, reject means keep (unwrap)
            editor.commands.lift('node-diff');
        }
    };

    const getDiffLabel = () => {
        return diffType === 'insert' ? 'Accept insertion' : 'Accept deletion';
    };

    const getRejectLabel = () => {
        return diffType === 'insert' ? 'Reject insertion' : 'Reject deletion';
    };

    return (
        <Card sx={{ width: 'fit-content', p: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
                size="small"
                onClick={handleAccept}
                title={getDiffLabel()}
            >
                <CheckIcon fontSize="inherit" />
            </IconButton>
            <IconButton
                size="small"
                onClick={handleReject}
                title={getRejectLabel()}
            >
                <CloseIcon fontSize="inherit" />
            </IconButton>
        </Card>
    );
};