import React, {useContext, useEffect, useState} from 'react'
import './style.css';
import {useAtomValue} from "jotai";
import {YjsProviderAtom} from "@forest/client/src/TreeState/YjsConnection";
import {XmlFragment} from 'yjs';
import Collaboration from '@tiptap/extension-collaboration'
import {CollaborationCursor} from './Extensions/collaboration-cursor'
import {BubbleMenu, EditorContent, useEditor} from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Image from '@tiptap/extension-image'
import {CommentExtension} from './Extensions/comment'
import {MathExtension} from '@aarkue/tiptap-math-extension'
import Bold from '@tiptap/extension-bold'
import {IconButton, Paper} from "@mui/material";
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import CommentIcon from '@mui/icons-material/Comment';
import LinkIcon from '@mui/icons-material/Link';
import CheckIcon from '@mui/icons-material/Check';
import {usePopper} from "react-popper";
import {LinkExtension} from "./Extensions/link";
import {ImageUploadExtension, uploadImage} from "./Extensions/image-upload";
import {UniversalPasteHandler} from "./Extensions/universal-paste-handler";
import {BookmarkNode} from "./Extensions/bookmark-node";
import {NodeVM} from "@forest/schema";
import {contentEditableContext} from "@forest/schema/src/viewContext";
import {Editor} from "@tiptap/core";
import {SlashCommandExtension} from "./Extensions/slash-command";
import {IframeExtension} from "./Extensions/iframe";
import {TableKit} from '@tiptap/extension-table'
import {SuggestDeleteExtension} from "./Extensions/suggest-delete";
import {SuggestInsertExtension} from "./Extensions/suggest-insert";
import {RevisionExtension} from "./Extensions/revision";


interface TiptapEditorProps {
    node: NodeVM,
    yXML: XmlFragment
}

const TiptapEditor = (props: TiptapEditorProps) => {
    const node = props.node
    const provider = useAtomValue(YjsProviderAtom)
    const yXML = props.yXML
    return <>
        <EditorImpl yXML={yXML} provider={provider} dataLabel="ydatapaperEditor" node={node}/>
    </>

};

export default TiptapEditor;

export function makeExtensions(yXML, provider) {
    return [
        Document,
        Paragraph,
        Text,
        BulletList,
        OrderedList,
        ListItem,
        Image,
        ImageUploadExtension,
        SuggestDeleteExtension,
        SuggestInsertExtension,
        RevisionExtension,
        Bold.configure({}),
        TableKit.configure({
            table: {resizable: true},
        }),
        MathExtension.configure({evaluation: false}),
        CommentExtension.configure({
            HTMLAttributes: {class: "comment"},
        }),
        LinkExtension.configure({
            HTMLAttributes: {},
        }),
        SlashCommandExtension.configure({}),
        IframeExtension,
        BookmarkNode,
        UniversalPasteHandler.configure({
            onBookmarkCreated: (url, metadata) => {
                console.log('Bookmark created:', url, metadata);
            },
            uploadImage: uploadImage
        }),
        ...(yXML ? [Collaboration.extend().configure({fragment: yXML})] : []),
        ...(provider ? [CollaborationCursor.extend().configure({provider})] : []),
    ];
}

export function makeSimpleEditor(yXML): Editor {

    const extensions = makeExtensions(yXML, null);
    if (yXML) {
        //console.log(yXML)
    }

    const editor = new Editor({
        enableContentCheck: true,
        onContentError: ({disableCollaboration}) => {
            console.error("Content error in Tiptap editor:", disableCollaboration);
            disableCollaboration();
        },
        extensions: extensions,
        editable: false
    });

    return editor
}

declare module '@tiptap/core' {
    interface EditorOptions {
        setHoverElements?: (hoverElements: any[] | ((prev: any) => {})) => void;
    }
}

const EditorImpl = ({yXML, provider, dataLabel, node}) => {
    const [hoverElements, setHoverElements] = useState([]);
    const [hasChangesInSelection, setHasChangesInSelection] = useState(false);
    const contentEditable = useContext(contentEditableContext);

    const extensions = makeExtensions(yXML, provider);
    const editor = useEditor({
        extensions: extensions,
        editable: contentEditable !== false,
        onCreate: ({editor}) => {
            node.vdata["tiptap_editor_" + dataLabel] = editor;
        },
        onDestroy: () => {
            delete node.vdata["tiptap_editor_" + dataLabel];
        },
        enableContentCheck: true,
        onContentError: ({disableCollaboration}) => {
            console.error("Content error in Tiptap editor:", disableCollaboration);
            disableCollaboration();
        },
        setHoverElements: setHoverElements,
        onSelectionUpdate: ({editor}) => {
            // Check if selection has any suggest marks
            const { state } = editor;
            const { from, to } = state.selection;
            let hasChanges = false;
            
            // Simple approach: check if any text nodes in selection have suggest marks
            state.doc.nodesBetween(from, to, (node, pos) => {
                if (node.isText) {
                    // Check if this text node has suggest marks
                    const hasMarks = node.marks.some(mark => 
                        mark.type.name === 'suggest-delete' || mark.type.name === 'suggest-adding'
                    );
                    
                    if (hasMarks) {
                        // Check if the selection actually overlaps with this node
                        const nodeStart = pos;
                        const nodeEnd = pos + node.nodeSize;
                        const selectionOverlaps = !(to <= nodeStart || from >= nodeEnd);
                        
                        if (selectionOverlaps) {
                            hasChanges = true;
                            return false; // Stop traversal
                        }
                    }
                }
            });
            
            setHasChangesInSelection(hasChanges);
        }
    });

    const handleClickComment = () => {
        const id = `comment-${Date.now()}`;
        editor?.commands.setComment(id, "");
        editor?.commands.displayComment(id, {"inputOn": true});
    };

    const handleClickLink = () => {
        const href = "http://";
        editor?.commands.setLink({href});
        editor?.commands.displayLink({href}, {"inputOn": true});
    };

    const handleClickBold = () => {
        const {state} = editor;
        const {from, to} = state.selection;

        // Apply bold to the selected text
        editor?.chain().focus().toggleBold().run();

        // Clear stored marks immediately after applying bold
        setTimeout(() => {
            // Clear stored marks to prevent bold from extending to new content
            const transaction = editor.state.tr.setStoredMarks([]);
            editor.view.dispatch(transaction);

            // Position cursor at the end of the selection
            editor?.commands.setTextSelection(to);
        }, 0);
    };

    const handleAcceptAllChanges = () => {
        const { state } = editor;
        const { from, to } = state.selection;
        let tr = state.tr;

        // Collect ranges to process from right to left to avoid position shifts
        const ranges = [];
        state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isText && node.marks) {
                const nodeStart = Math.max(from, pos);
                const nodeEnd = Math.min(to, pos + node.nodeSize);
                
                node.marks.forEach((mark) => {
                    if (mark.type.name === 'suggest-delete' || mark.type.name === 'suggest-adding') {
                        ranges.push({
                            start: nodeStart,
                            end: nodeEnd,
                            mark: mark,
                            isDelete: mark.type.name === 'suggest-delete'
                        });
                    }
                });
            }
        });

        // Process ranges from right to left to avoid position shifts when deleting
        ranges.sort((a, b) => b.start - a.start);
        
        ranges.forEach(({ start, end, mark, isDelete }) => {
            if (isDelete) {
                // Accept deletion: remove both the mark and the content
                tr = tr.removeMark(start, end, mark);
                tr = tr.delete(start, end);
            } else {
                // Accept insertion: remove the mark, keep the content
                tr = tr.removeMark(start, end, mark);
            }
        });

        if (tr.docChanged) {
            editor.view.dispatch(tr);
        }
    };

    if (!editor) {
        return null;
    }
    // @ts-ignore
    return (
        <div className="column-half">
            <EditorContent editor={editor}/>
            <BubbleMenu
                editor={editor}
                tippyOptions={{duration: 100}}
                shouldShow={({editor, view, state, oldState, from, to}) => {
                    // Don't show bubble menu when selecting image upload nodes
                    const {selection} = state;
                    const {$from, $to} = selection;

                    // Check if selection contains any image upload nodes
                    let hasImageUpload = false;
                    state.doc.nodesBetween(from, to, (node) => {
                        if (node.type.name === 'imageUpload') {
                            hasImageUpload = true;
                            return false; // Stop traversal
                        }
                    });

                    // Don't show if selection contains image upload nodes
                    if (hasImageUpload) {
                        return false;
                    }

                    // Show bubble menu for text selections and regular content
                    return !selection.empty;
                }}
            >
                <Paper elevation={3} sx={{backgroundColor: 'white', padding: 0.5, display: 'flex', gap: 0.5}}>
                    <IconButton
                        size="small"
                        onClick={handleClickBold}
                        sx={{color: 'black'}}
                    >
                        <FormatBoldIcon/>
                    </IconButton>
                    <IconButton size="small" onClick={handleClickComment} sx={{color: 'black'}}>
                        <CommentIcon/>
                    </IconButton>
                    <IconButton size="small" onClick={handleClickLink} sx={{color: 'black'}}>
                        <LinkIcon/>
                    </IconButton>
                    {hasChangesInSelection && (
                        <IconButton 
                            size="small" 
                            onClick={handleAcceptAllChanges} 
                            sx={{color: 'green'}}
                            title="Accept all changes"
                        >
                            <CheckIcon/>
                        </IconButton>
                    )}
                </Paper>
            </BubbleMenu>
            <HoverElements hoverElements={hoverElements} editor={editor}/>
        </div>
    );
};

const HoverElement = ({el, render, editor, source}) => {
    const [referenceElement, setReferenceElement] = useState(null);
    const [popperElement, setPopperElement] = useState(null);

    // Use different placement for comments and links to avoid collision with BubbleMenu
    const placement = (source === 'comment' || source === 'link') ? 'bottom-start' : 'top-start';

    const {styles, attributes} = usePopper(referenceElement, popperElement, {
        placement: placement,
        modifiers: [
            {
                name: 'offset',
                options: {
                    offset: [0, 8],
                },
            },
        ],
    });

    useEffect(() => {
        setReferenceElement(el);
    }, [el]);

    return (
        <div
            ref={setPopperElement}
            style={{...styles.popper, zIndex: 99}}
            {...attributes.popper}
        >
            {render(el, editor)}
        </div>
    );
};

const HoverElements = ({hoverElements, editor}) => {
    return (
        <>
            {hoverElements.map(({el, render, source}, index) => (
                <HoverElement
                    key={index}
                    el={el}
                    render={render}
                    editor={editor}
                    source={source}
                />
            ))}
        </>
    );
};
