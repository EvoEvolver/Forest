import React, {useEffect, useRef} from 'react'
import {redo, undo, yCursorPlugin, ySyncPlugin, yUndoPlugin} from 'y-prosemirror';
import {EditorState, Plugin} from 'prosemirror-state';
import {schema} from './schema';
import {EditorView} from 'prosemirror-view';
// @ts-ignore
import {buildInputRules, buildKeymap, buildMenuItems, exampleSetup} from 'prosemirror-example-setup';
// @ts-ignore
import {keymap} from 'prosemirror-keymap';
import './style.css';
import {useAtomValue} from "jotai/index";
import {YjsProviderAtom} from "../../../TreeState/YjsConnection";
import {Node} from "../../../entities";
import {XmlFragment} from 'yjs';
import {Schema} from "prosemirror-model";
import {menuBar, MenuElement} from "prosemirror-menu"
import {baseKeymap} from "prosemirror-commands";
import {dropCursor} from "prosemirror-dropcursor";
import {gapCursor} from "prosemirror-gapcursor";
import {history} from "prosemirror-history";

const ProseMirrorEditor: React.FC = (props: { node: Node }) => {
    const node = props.node
    const editorRef = useRef<HTMLDivElement | null>(null);
    const provider = useAtomValue(YjsProviderAtom)
    let yXML = node.ydata.get("yXmlForEditor");
    if (!yXML) {
        yXML = new XmlFragment();
        node.ydata.set("yXmlForEditor", yXML);
    }

    useEffect(() => {
        let prosemirrorView: EditorView | null = null;
        if (editorRef.current) {
            prosemirrorView = new EditorView(editorRef.current, {
                state: EditorState.create({
                    schema,
                    plugins: [
                        ySyncPlugin(yXML),
                        yCursorPlugin(provider.awareness),
                        yUndoPlugin(),
                        keymap({
                            'Mod-z': undo,
                            'Mod-y': redo,
                            'Mod-Shift-z': redo,
                        }),
                    ].concat(editorSetup({schema})),
                }),
            });
        }

        // Cleanup on unmount
        return () => {
            if (prosemirrorView) {
                prosemirrorView.destroy();
            }
        };
    }, []);

    return <div id="editor" ref={editorRef} style={{height: '100%', width: '100%'}}/>;
};

function editorSetup(options: {
  /// The schema to generate key bindings and menu items for.
  schema: Schema
  /// Can be used to [adjust](#example-setup.buildKeymap) the key bindings created.
  mapKeys?: {[key: string]: string | false}
  /// Set to false to disable the menu bar.
  menuBar?: boolean
  /// Set to false to disable the history plugin.
  history?: boolean
  /// Set to false to make the menu bar non-floating.
  floatingMenu?: boolean
  /// Can be used to override the menu content.
  menuContent?: MenuElement[][]
}) {
  let plugins = [
    buildInputRules(options.schema),
    keymap(buildKeymap(options.schema, options.mapKeys)),
    keymap(baseKeymap),
    dropCursor(),
    gapCursor()
  ]
  if (options.menuBar !== false)
    plugins.push(menuBar({floating: options.floatingMenu !== false,
                          content: options.menuContent || buildMenuItems(options.schema).fullMenu}))
  if (options.history !== false)
    plugins.push(history())

  return plugins.concat(new Plugin({
    props: {
      attributes: {class: "ProseMirror-example-setup-style"}
    }
  }))
}


export default ProseMirrorEditor;