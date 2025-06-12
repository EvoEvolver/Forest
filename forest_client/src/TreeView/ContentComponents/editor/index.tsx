import React, {useContext, useEffect, useState} from 'react'
import './style.css';
import {useAtomValue} from "jotai";
import {YjsProviderAtom} from "../../../TreeState/YjsConnection";
import {XmlFragment} from 'yjs';
import {thisNodeContext} from "../../NodeContentTab";
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
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

interface TiptapEditorProps {
    label?: string
}

const TiptapEditor = (props: TiptapEditorProps) => {
    const node = useContext(thisNodeContext)
    const provider = useAtomValue(YjsProviderAtom)
    const ydataLabel = props.label || "";
    // This cannot be edited because it will break the existing docs
    const ydataKey = "ydata" + ydataLabel;
    let yXML = node.ydata.get(ydataKey);
    if (!yXML) {
        yXML = new XmlFragment();
        node.ydata.set(ydataKey, yXML);
    }
    return <>
        <EditorImpl yXML={yXML} provider={provider} dataLabel={ydataLabel}/>
    </>

};


export default TiptapEditor;

const EditorImpl = ({yXML, provider, dataLabel}) => {
    const node = useContext(thisNodeContext)
    const [hoverElements, setHoverElements] = useState([]);


    const extensions = [
        Document,
        Paragraph,
        Text,
        BulletList,
        OrderedList,
        ListItem,
        Image,
        Bold,
        MathExtension.configure({evaluation: false}),
        Collaboration.extend().configure({
            fragment: yXML,
        }),
        CollaborationCursor.extend().configure({
            provider,
        }),
    ]

    const commentExtension = CommentExtension.configure({
        HTMLAttributes: {class: "comment"},
        onCommentActivated: makeOnCommentActivated(setHoverElements)
    })
    const linkExtension = LinkExtension.configure({
        HTMLAttributes: {},
        onLinkActivated: makeOnLinkActivated(setHoverElements)
    })
    extensions.push(commentExtension)
    extensions.push(linkExtension)

    const handleClickComment = (event: React.MouseEvent<HTMLButtonElement>) => {
        const id = `comment-${Date.now()}`;
        editor?.commands.setComment(id, "");
        commentExtension.options.onCommentActivated(id, editor, {"inputOn": true});
    };

    const handleClickLink = (event: React.MouseEvent<HTMLButtonElement>) => {
        const href = " "
        editor?.commands.setLink({href});
        linkExtension.options.onLinkActivated(href, editor, {"inputOn": true});
    }

    const editor = useEditor({
        enableContentCheck: true,
        onContentError: ({disableCollaboration}) => {
            console.error("Content error in Tiptap editor:", disableCollaboration);
            disableCollaboration()
        },
        extensions: extensions,
    })

    // Destroy the editor when the component unmounts
    useEffect(() => {
        const editorFieldName = "tiptap_editor_" + dataLabel;
        node.data[editorFieldName] = editor
        return () => {
            editor.destroy();
        }
    }, []);

    if (!editor) {
        return null
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
    )
}

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