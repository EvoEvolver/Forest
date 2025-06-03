import React, {useContext, useRef} from 'react'
import './style.scss';
import {useAtomValue} from "jotai";
import {YjsProviderAtom} from "../../../TreeState/YjsConnection";
import {XmlFragment} from 'yjs';
import {thisNodeContext} from "../../NodeContentTab";
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import {EditorContent, useEditor} from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

interface TiptapEditorProps {
    label?: string
}


const TiptapEditor = (props: TiptapEditorProps) => {
    const node = useContext(thisNodeContext)
    const editorRef = useRef<HTMLDivElement | null>(null);
    const provider = useAtomValue(YjsProviderAtom)
    const ydataLabel = props.label || "";
    const ydataKey = "ydata" + ydataLabel;
    let yXML = node.ydata.get(ydataKey);
    if (!yXML) {
        yXML = new XmlFragment();
        node.ydata.set(ydataKey, yXML);
    }


    return <>
        <EditorImpl yXML={yXML} provider={provider}/>
    </>

};


export default TiptapEditor;

const EditorImpl = ({
                        yXML, provider,
                    }) => {

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
            Collaboration.extend().configure({
                fragment: yXML,
            }),
            CollaborationCursor.extend().configure({
                provider,
            }),
        ],
    })


    if (!editor) {
        return null
    }

    return (
        <div className="column-half">
            <EditorContent editor={editor} className="main-group"/>
        </div>
    )
}