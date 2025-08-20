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
import {CommentExtension, makeOnCommentActivated} from './Extensions/comment'
import {MathExtension} from '@aarkue/tiptap-math-extension'
import Bold from '@tiptap/extension-bold'
import {IconButton, Paper} from "@mui/material";
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import CommentIcon from '@mui/icons-material/Comment';
import LinkIcon from '@mui/icons-material/Link';
import {usePopper} from "react-popper";
import {LinkExtension, makeOnLinkActivated} from "./Extensions/link";
import {ImageUploadExtension, uploadImage} from "./Extensions/image-upload";
import {UniversalPasteHandler} from "./Extensions/universal-paste-handler";
import {BookmarkNode} from "./Extensions/bookmark-node";
import {NodeVM} from "@forest/schema";
import {contentEditableContext} from "@forest/schema/src/viewContext";
import {Editor} from "@tiptap/core";
import {makeOnSlashActivated, SlashCommandExtension} from "./Extensions/slash-command";
import {IframeExtension} from "./Extensions/iframe";
import {TableKit} from '@tiptap/extension-table'

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

export function makeExtensions(yXML, provider, onCommentActivated, onLinkActivated, setHoverElements) {
    const onCommentActivatedHandler = onCommentActivated || ((id, editor, options) => {
    });
    const onLinkActivatedHandler = onLinkActivated || ((href, editor, options) => {
    });
    const onSlashActivatedHandler = makeOnSlashActivated(setHoverElements || (() => {
    }));
    return [
        Document,
        Paragraph,
        Text,
        BulletList,
        OrderedList,
        ListItem,
        Image,
        ImageUploadExtension,
        Bold.configure({}),
        TableKit.configure({
            table: { resizable: true },
        }),
        MathExtension.configure({evaluation: false}),
        CommentExtension.configure({
            HTMLAttributes: {class: "comment"},
            onCommentActivated: onCommentActivatedHandler,
        }),
        LinkExtension.configure({
            HTMLAttributes: {},
            onLinkActivated: onLinkActivatedHandler,
        }),
        SlashCommandExtension.configure({
            onSlashActivated: onSlashActivatedHandler,
        }),
        IframeExtension,
        BookmarkNode,
        ...(setHoverElements ? [UniversalPasteHandler.configure({
            onBookmarkCreated: (url, metadata) => {
                console.log('Bookmark created:', url, metadata);
            },
            setHoverElements: setHoverElements,
            uploadImage: uploadImage
        })] : []),
        ...(yXML ? [Collaboration.extend().configure({fragment: yXML})] : []),
        ...(provider ? [CollaborationCursor.extend().configure({provider})] : []),
    ];
}

export function makeEditor(yXML, provider, contentEditable, onCommentActivated, onLinkActivated, setHoverElements): Editor {

    const extensions = makeExtensions(yXML, provider, onCommentActivated, onLinkActivated, setHoverElements);
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
        editable: contentEditable !== false
    });

    return editor
}


const EditorImpl = ({yXML, provider, dataLabel, node}) => {
    const [hoverElements, setHoverElements] = useState([]);
    const contentEditable = useContext(contentEditableContext);
    const onCommentActivated = makeOnCommentActivated(setHoverElements);
    const onLinkActivated = makeOnLinkActivated(setHoverElements);

    const editor = useEditor({
        extensions: makeExtensions(yXML, provider, onCommentActivated, onLinkActivated, setHoverElements),
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
    });

    const handleClickComment = () => {
        const id = `comment-${Date.now()}`;
        editor?.commands.setComment(id, "");
        onCommentActivated(id, editor, {"inputOn": true});
    };

    const handleClickLink = () => {
        const href = " ";
        editor?.commands.setLink({href});
        onLinkActivated(href, editor, {"inputOn": true});
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
