import {Mark, mergeAttributes, Range} from "@tiptap/core";
import {Mark as PMMark} from "@tiptap/pm/model";
import "./comment.css"
import React, {useEffect, useState} from "react";
import {Card, IconButton, TextField} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from "@mui/icons-material/Delete";

// Update the Commands interface
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        comment: {
            setComment: (commentId: string, comment: string) => ReturnType;
            unsetComment: (commentId: string) => ReturnType;
        };
    }
}


interface MarkWithRange {
    mark: PMMark;
    range: Range;
}

interface CommentOptions {
    HTMLAttributes: Record<string, any>;
    onCommentActivated: (commentId: string, editor, options: any) => void;
}


export const CommentExtension = Mark.create<CommentOptions>({
    name: "comment",

    addOptions() {
        return {
            HTMLAttributes: {},
            onCommentActivated: () => {
            },
        };
    },

    // Prevent the comment mark from extending to new content
    inclusive: false,

    // Inside CommentExtension, update the addAttributes method:
    addAttributes() {
        return {
            commentId: {
                default: null,
                parseHTML: (el) =>
                    (el as HTMLSpanElement).getAttribute("data-comment-id"),
                renderHTML: (attrs) => ({"data-comment-id": attrs.commentId}),
            },
            comment: {
                default: null,
                parseHTML: (el) =>
                    (el as HTMLSpanElement).getAttribute("data-comment"),
                renderHTML: (attrs) => ({"data-comment": attrs.comment}),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "span[data-comment-id]",
                getAttrs: (el) => {
                    const commentId = (el as HTMLSpanElement).getAttribute("data-comment-id");
                    return commentId?.trim() ? null : false;
                },
            },
        ];
    },

    renderHTML({HTMLAttributes}) {
        return [
            "span",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
            0,
        ];
    },

    onSelectionUpdate() {
        const {$from} = this.editor.state.selection;

        const marks = $from.marks();

        if (!marks.length) {
            this.options.onCommentActivated(null, this.editor, null);
            return;
        }

        const commentMark = this.editor.schema.marks.comment;

        const activeCommentMark = marks.find((mark) => mark.type === commentMark);

        const activeCommentId = activeCommentMark?.attrs.commentId || null;

        this.options.onCommentActivated(activeCommentId, this.editor, null);
    },

    addCommands() {
        return {
            setComment:
                (commentId, comment) =>
                    ({commands}) => {
                        if (!commentId) return false;

                        return commands.setMark("comment", {commentId, comment});
                    },
            updateComment: (commentId, comment) =>
                ({tr, dispatch}) => {
                    if (!commentId) return false;

                    const commentMarksWithRange: MarkWithRange[] = [];

                    tr.doc.descendants((node, pos) => {
                        const commentMark = node.marks.find(
                            (mark) =>
                                mark.type.name === "comment" &&
                                mark.attrs.commentId === commentId,
                        );

                        if (!commentMark) return;

                        commentMarksWithRange.push({
                            mark: commentMark,
                            range: {
                                from: pos,
                                to: pos + node.nodeSize,
                            },
                        });
                    });

                    commentMarksWithRange.forEach(({mark, range}) => {
                        const newAttrs = {...mark.attrs, comment};
                        tr.addMark(range.from, range.to, mark.type.create(newAttrs));
                    });

                    return dispatch?.(tr);
                },
            unsetComment:
                (commentId) =>
                    ({tr, dispatch}) => {
                        if (!commentId) return false;

                        const commentMarksWithRange: MarkWithRange[] = [];

                        tr.doc.descendants((node, pos) => {
                            const commentMark = node.marks.find(
                                (mark) =>
                                    mark.type.name === "comment" &&
                                    mark.attrs.commentId === commentId,
                            );

                            if (!commentMark) return;

                            commentMarksWithRange.push({
                                mark: commentMark,
                                range: {
                                    from: pos,
                                    to: pos + node.nodeSize,
                                },
                            });
                        });

                        commentMarksWithRange.forEach(({mark, range}) => {
                            tr.removeMark(range.from, range.to, mark);
                        });

                        return dispatch?.(tr);
                    },
        };
    },
});


/*
Above part of the code is licensed under the
MIT License
Copyright (c) 2023 Jeet Mandaliya (github: sereneinserenade)
 */

/*
The below part of the code is licensed as the whole project
 */

export const CommentHover = ({hoveredEl, editor, options}) => {

    const commentId = hoveredEl.getAttribute("data-comment-id");
    const commentContent = hoveredEl.getAttribute("data-comment");
    const [editedComment, setEditedComment] = useState(commentContent);
    const [isEditing, setIsEditing] = useState(options['inputOn'] || false);

    const handleCommentUpdate = () => {
        editor.commands.updateComment(commentId, editedComment);
        setIsEditing(false);
        
        // Clear stored marks after updating comment to prevent extension
        setTimeout(() => {
            // Clear any stored marks to prevent comment from extending to new content
            const tr = editor.state.tr.setStoredMarks([]);
            editor.view.dispatch(tr);
        }, 0);
    };

    const removeHover = () => {
        const commentExtension = editor.extensionManager.extensions.find(ext => ext.name === 'comment');
        setIsEditing(false);
        commentExtension.options.onCommentActivated(null, editor, null);
    }

    const handleCommentRemove = () => {
        editor.commands.unsetComment(commentId);
        removeHover();
    };

    useEffect(() => {
        const newCommentContent = hoveredEl.getAttribute("data-comment");
        setEditedComment(newCommentContent);
    }, [hoveredEl]);

    return (
        <Card sx={{width: 'fit-content', p: 0.5}} style={{padding: "0"}}>
            {isEditing ? (
                <TextField
                    size="small"
                    value={editedComment}
                    onChange={(e) => setEditedComment(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleCommentUpdate();
                            setIsEditing(false);
                            e.preventDefault();
                        }
                    }}
                    onBlur={handleCommentUpdate}
                    autoFocus
                />
            ) : (
                <><span
                    style={{paddingLeft: '8px', display: 'inline-block'}}
                >
                    {editedComment}
                </span>
                    <IconButton
                        size="small"
                        onClick={() => setIsEditing(true)}
                    >
                        <EditIcon/>
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={handleCommentRemove}
                    >
                        <DeleteIcon/>
                    </IconButton></>
            )}

        </Card>
    );
};

export function makeOnCommentActivated(setHoverElements) {
    return (commentId, editor, options) => {
        let _options = options || {};
        if (!commentId) {
            setHoverElements(prev => {
                // Filter out the comment hover elements
                return prev.filter(el => el.source !== "comment");
            })
            return;
        }
        const el = editor.view.dom.querySelector(`[data-comment-id="${commentId}"]`);
        const hoverElement = {
            source: "comment",
            el: el,
            render: (el, editor) => (
                <CommentHover
                    key={commentId} // Add this
                    hoveredEl={el}
                    editor={editor}
                    options={{..._options}}
                />
            )
        }
        setHoverElements([hoverElement]);
    }
}