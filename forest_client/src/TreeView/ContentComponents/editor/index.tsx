import React, {useContext, useState} from 'react'
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
import {CommentExtension} from './Extensions/comment'
import RateReviewIcon from '@mui/icons-material/RateReview';
import {CommentComponent, Comment} from "./EditorComponents/Comment/commentComponent";

// get if the current environment is development or production
// @ts-ignore
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

export default TiptapEditor;


const EditorImpl = ({yXML, provider, dataLabel}) => {
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

    if (isDevMode) {
        const commentExtension = CommentExtension.configure({
            HTMLAttributes: {
                class: "my-comment",
            },
            onCommentActivated: (commentId) => {},
        })
        // @ts-ignore
        extensions.push(commentExtension)
    }

    const [comments, setComments] = useState<Comment[]>([])

    const setComment = () => {
        const id = `comment-${Date.now()}`;
        const newComment: Comment = {
            id,
            content: '',
            replies: [],
            createdAt: new Date(),
            selection: null
        };
        editor?.commands.setComment(newComment.id)
        setComments((prev) => ([...prev, newComment]))
        newComment.selection = document.querySelector(`[data-comment-id="${id}"]`) as HTMLElement
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
            {isDevMode && comments.map((comment: Comment) => (
                <CommentComponent key={comment.id} comment={comment} />
            ))}
        </div>
    )
}