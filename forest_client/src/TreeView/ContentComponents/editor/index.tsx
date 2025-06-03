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
const AiGeneratedToolbar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        onClick={() => editor.chain().focus().toggleMark('aiGenerated').run()}
        style={{
          backgroundColor: editor.isActive('aiGenerated') ? '#3399ff' : '#eee',
          color: editor.isActive('aiGenerated') ? '#fff' : '#000',
          padding: '4px 8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          marginRight: '4px',
        }}
      >
        Toggle AI Mark
      </button>
    </div>
  );
};


const EditorImpl = ({
  yXML, provider,
}) => {
  const [status, setStatus] = useState('connecting')
  const [currentUser, setCurrentUser] = useState([])

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
      StarterKit.configure({
        history: false,
      }),
      Highlight,
      TaskList,
      TaskItem,
      AiGenerated,
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

  useEffect(() => {
    // Update status changes
    const statusHandler = event => {
      setStatus(event.status)
    }

    provider.on('status', statusHandler)

    return () => {
      provider.off('status', statusHandler)
    }
  }, [provider])


  if (!editor) {
    return null
  }

  return (
    <div className="column-half">
      <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-200 rounded-md bg-gray-50 shadow-sm">
        <button
          onClick={() => editor.chain().focus().toggleAiGenerated().run()}
          disabled={!editor.can().toggleAiGenerated()} // Disable if selection cannot be wrapped/unwrapped
          title={editor.isActive('aiGenerated') ? 'Unmark selected AI text' : 'Mark selected text as AI'}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
            ${editor.isActive('aiGenerated') 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-blue-500 text-white hover:bg-blue-600'}
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {editor.isActive('aiGenerated') ? 'Unmark AI Text' : 'Mark as AI Text'}
        </button>
         {/* Add other toolbar buttons here as needed, e.g., bold, italic */}
        <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${editor.isActive('bold') ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} disabled:opacity-50`}
        >
            Bold
        </button>
      </div>
      <EditorContent editor={editor} className="main-group"/>
    </div>
  )
}