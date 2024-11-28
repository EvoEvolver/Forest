import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { QuillBinding } from 'y-quill'
import Quill from 'quill'
import QuillCursors from 'quill-cursors'

Quill.register('modules/cursors', QuillCursors)

const quill = new Quill(document.querySelector('#editor'), {
  modules: {
    cursors: true,
    toolbar: [
      // adding some basic Quill content features
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      ['image', 'code-block']
    ],
    history: {
      // Local undo shouldn't undo changes
      // from remote users
      userOnly: true
    }
  },
  placeholder: 'Start collaborating...',
  theme: 'snow' // 'bubble' is also great
})

// A Yjs document holds the shared data
const ydoc = new Y.Doc()

const provider = new WebsocketProvider('ws://localhost:29999', 'my-roomname', ydoc)

// Define a shared text type on the document
const ytext = ydoc.getText('quill')

// "Bind" the quill editor to a Yjs text type.
const binding = new QuillBinding(ytext, quill, provider.awareness)

// Remove the selection when the iframe is blurred
window.addEventListener('blur', () => { quill.blur() })
