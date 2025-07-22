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
import {Button} from "@mui/material";
import {usePopper} from "react-popper";
import {LinkExtension, makeOnLinkActivated} from "./Extensions/link";
import {NodeVM} from "@forest/schema";
import {contentEditableContext} from "@forest/schema/src/viewContext";
import {Editor} from "@tiptap/core";

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

function makeExtensions(yXML, provider, onCommentActivated, onLinkActivated) {
    const onCommentActivatedHandler = onCommentActivated || ((id, editor, options) => {
    });
    const onLinkActivatedHandler = onLinkActivated || ((href, editor, options) => {
    });
    return [
        Document,
        Paragraph,
        Text,
        BulletList,
        OrderedList,
        ListItem,
        Image,
        Bold,
        MathExtension.configure({evaluation: false}),
        CommentExtension.configure({
            HTMLAttributes: {class: "comment"},
            onCommentActivated: onCommentActivatedHandler,
        }),
        LinkExtension.configure({
            HTMLAttributes: {},
            onLinkActivated: onLinkActivatedHandler,
        }),
        ...(yXML ? [Collaboration.extend().configure({fragment: yXML})] : []),
        ...(provider ? [CollaborationCursor.extend().configure({provider})] : []),
    ];
}

export function makeEditor(yXML, provider, contentEditable, onCommentActivated, onLinkActivated): Editor {

    const extensions = makeExtensions(yXML, provider, onCommentActivated, onLinkActivated);
    if (yXML) {
        console.log(yXML)
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
        extensions: makeExtensions(yXML, provider, onCommentActivated, onLinkActivated),
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

    if (!editor) {
        return null;
    }
    return (
        <div className="column-half">
            <EditorContent editor={editor} className="main-group"/>
            <BubbleMenu editor={editor} tippyOptions={{duration: 100}}>
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    Bold
                </Button>
                <Button variant="contained" size="small" onClick={handleClickComment}>Comment</Button>
                <Button variant="contained" size="small" onClick={handleClickLink}>Link</Button>
            </BubbleMenu>
            <HoverElements hoverElements={hoverElements} editor={editor}/>
        </div>
    );
};

const HoverElement = ({el, render, editor}) => {
    const [referenceElement, setReferenceElement] = useState(null);
    const [popperElement, setPopperElement] = useState(null);

    const {styles, attributes} = usePopper(referenceElement, popperElement, {
        placement: 'top-start',
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
            {hoverElements.map(({el, render}, index) => (
                <HoverElement
                    key={index}
                    el={el}
                    render={render}
                    editor={editor}
                />
            ))}
        </>
    );
};
