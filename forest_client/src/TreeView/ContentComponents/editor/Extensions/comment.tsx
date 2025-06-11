import {Mark, mergeAttributes, Range} from "@tiptap/core";
import {Mark as PMMark} from "@tiptap/pm/model";
import "./comment.css"
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
    onCommentActivated: (commentId: string) => void;
}

interface CommentStorage {
    activeCommentId: string | null;
}

export const CommentExtension = Mark.create<CommentOptions, CommentStorage>({
    name: "comment",

    addOptions() {
        return {
            HTMLAttributes: {},
            onCommentActivated: () => {
            },
        };
    },

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
            this.storage.activeCommentId = null;
            this.options.onCommentActivated(this.storage.activeCommentId);
            return;
        }

        const commentMark = this.editor.schema.marks.comment;

        const activeCommentMark = marks.find((mark) => mark.type === commentMark);

        this.storage.activeCommentId = activeCommentMark?.attrs.commentId || null;

        this.options.onCommentActivated(this.storage.activeCommentId);
    },

    addStorage() {
        return {
            activeCommentId: null,
        };
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
                        const newAttrs = { ...mark.attrs, comment };
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
MIT License

Copyright (c) 2023 Jeet Mandaliya (github: sereneinserenade)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */