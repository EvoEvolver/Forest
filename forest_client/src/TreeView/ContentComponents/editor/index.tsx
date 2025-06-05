import React, {useContext, useEffect, useRef, useState} from 'react'
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

    const [comments, setComments] = useState<Comment[]>([])
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null)

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
        extensions: [
            Document,
            Paragraph,
            Text,
            BulletList,
            OrderedList,
            ListItem,
            Image,
            CommentExtension.configure({
                HTMLAttributes: {
                    class: "my-comment",
                },
                onCommentActivated: (commentId) => {
                    setActiveCommentId(commentId);
                },
            }),
            Collaboration.extend().configure({
                fragment: yXML,
            }),
            CollaborationCursor.extend().configure({
                provider,
            }),
        ],
    })

    const node = useContext(thisNodeContext)
    node.data["tiptap_editor_" + dataLabel] = editor
    if (!editor) {
        return null
    }

    return (
        <div className="column-half">
            <EditorContent editor={editor} className="main-group"/>
            <BubbleMenu editor={editor} className='p-1 border rounded-lg border-slate-400'>
                <button
                    className='rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-white/20'
                    onClick={setComment}
                >
                    <RateReviewIcon/>
                </button>
            </BubbleMenu>
            {activeCommentId && (
                <div>
                    <b>Comment: </b>
                    <div className="comment">
                        {comments.find(comment => comment.id === activeCommentId)?.content || "No content"}
                    </div>
                </div>
            )}
        </div>
    )
}