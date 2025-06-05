import React, {useContext, useEffect, useState} from 'react'
import './style.css';
import './comment.css';
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
import {CommentExtension} from './comment'
import RateReviewIcon from '@mui/icons-material/RateReview';
import {usePopper} from 'react-popper';

// get if the current environment is development or production
const isDevMode = (import.meta.env.MODE === 'development');
if (isDevMode) {
    console.warn("this is dev mode");
}

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

interface Comment {
    id: string
    content: string
    replies: Comment[]
    createdAt: Date
}

export default TiptapEditor;

const EditorImpl = ({
                        yXML, provider, dataLabel
                    }) => {


    const extensions = [
        Document,
        Paragraph,
        Text,
        BulletList,
        OrderedList,
        ListItem,
        Image,

        Collaboration.extend().configure({
            fragment: yXML,
        }),
        CollaborationCursor.extend().configure({
            provider,
        }),
    ]

    const [comments, setComments] = useState<Comment[]>([])
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
    const [activeCommentElement, setActiveCommentElement] = useState<HTMLElement | null>(null)

    useEffect(() => {
        // update active comment element when activeCommentId changes
        if (activeCommentId) {
            const commentElement = document.querySelector(`[data-comment-id="${activeCommentId}"]`);
            setActiveCommentElement(commentElement as HTMLElement);
        } else {
            setActiveCommentElement(null);
        }
    }, [activeCommentId]);

    const setComment = () => {
        const newComment = {
            id: `comment-${Date.now()}`,
            content: 'to be done',
            replies: [],
            createdAt: new Date(),
        }
        setComments([...comments, newComment])
        editor?.commands.setComment(newComment.id)
        setActiveCommentId(newComment.id)
    }

    if (isDevMode) {

        const commentExtension = CommentExtension.configure({
            HTMLAttributes: {
                class: "my-comment",
            },
            onCommentActivated: (commentId) => {
                setActiveCommentId(commentId);
            },
        })
        extensions.push(commentExtension)
    }

    const editor = useEditor({
        enableContentCheck: true,
        onContentError: ({disableCollaboration}) => {
            disableCollaboration()
        },
        onCreate: ({editor: currentEditor}) => {
            provider.on('synced', () => {
                if (currentEditor.isEmpty) {
                    currentEditor.commands.setContent("")
                }
            })
        },
        extensions: extensions,
    })

    const node = useContext(thisNodeContext)
    node.data["tiptap_editor_" + dataLabel] = editor
    if (!editor) {
        return null
    }

    return (
        <div className="column-half">
            <EditorContent editor={editor} className="main-group"/>
            {isDevMode && <BubbleMenu editor={editor} className='p-1 border rounded-lg border-slate-400'>
                <button
                    className='rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-white/20'
                    onClick={setComment}
                >
                    <RateReviewIcon/>
                </button>
            </BubbleMenu>
            }
            {isDevMode && activeCommentId && (
                <InputBubble target={activeCommentElement}/>
            )}

        </div>
    )
}
/*
When target is provided, it will display <div>123</div> in the bubble and put it in the target element use popper.js
 */
const InputBubble = ({target}) => {
    const [referenceElement, setReferenceElement] = useState(null);
    const [popperElement, setPopperElement] = useState(null);
    const {styles, attributes} = usePopper(referenceElement, popperElement, {
        placement: 'top',
    });

    useEffect(() => {
        if (target) {
            setReferenceElement(target);
        }
    }, [target]);

    return (
        <div ref={setPopperElement} style={styles.popper} {...attributes.popper}>
            <div style={{
                backgroundColor: 'white',
            }}>Some comment
            </div>
        </div>
    );

}