import {
  MDXEditor,
  headingsPlugin,
  markdownShortcutPlugin,
  listsPlugin,
  BoldItalicUnderlineToggles, UndoRedo, toolbarPlugin
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import React from 'react'



export default (props)=>{
  let timeoutId
  function sendUpdate(content) {
      props.env_vars.node.data.editor_content = content
      console.log("sendUpdate", content)
    clearTimeout(timeoutId)
      console.log("after", props.env_vars.node.data.editor_content)
    timeoutId = setTimeout(() => {
        props.env_funcs.send_message_to_main({type: "updateContent", content})
    }, 2000)
  }
  return <MDXEditor markdown={props.src || ""} plugins={[headingsPlugin(), listsPlugin(), markdownShortcutPlugin(), toolbarPlugin({
          toolbarContents: () => (
            <>
              {' '}
              <UndoRedo />
              <BoldItalicUnderlineToggles />
            </>
          )
        })]} onChange={sendUpdate} />
}