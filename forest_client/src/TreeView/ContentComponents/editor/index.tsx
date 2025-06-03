import React, {useContext, useEffect, useRef, useCallback, useState} from 'react'
import './style.scss';
import {useAtomValue} from "jotai";
import {YjsProviderAtom} from "../../../TreeState/YjsConnection";
import {Node} from "../../../entities";
import {XmlFragment} from 'yjs';
import {thisNodeContext} from "../../NodeContentTab";
import CharacterCount from '@tiptap/extension-character-count'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import Highlight from '@tiptap/extension-highlight'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { EditorContent, useEditor } from '@tiptap/react'
import {StarterKit} from '@tiptap/starter-kit'
import { AiGenerated } from './AiGeneratedNode';
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

interface TiptapEditorProps {
    label?: string
}


const TiptapEditor= (props: TiptapEditorProps) => {
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
      <EditorImpl yXML={yXML} provider={provider} />
    </>

};


export default TiptapEditor;


function getToolBar(editor: Editor) {
  return <div className="control-group">
    <div className="button-group">
      <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
      >
        Bold
      </button>
      <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
      >
        Italic
      </button>
      <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
      >
        Strike
      </button>
      <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
      >
        Bullet list
      </button>
      <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'is-active' : ''}
      >
        Code
      </button>
    </div>
  </div>;
}

const EditorImpl = ({
  yXML, provider,
}) => {

  const editor = useEditor({
    enableContentCheck: true,
    onContentError: ({ disableCollaboration }) => {
      disableCollaboration()
    },
    onCreate: ({ editor: currentEditor }) => {
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
      /*CharacterCount.extend().configure({
        limit: 10000,
      }),*/
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