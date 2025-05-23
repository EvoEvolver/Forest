import React, {useEffect, useRef} from 'react'
import {redo, undo, yCursorPlugin, ySyncPlugin, yUndoPlugin} from 'y-prosemirror';
import {EditorState} from 'prosemirror-state';
import {schema} from './schema';
import {EditorView} from 'prosemirror-view';
// @ts-ignore
import {exampleSetup} from 'prosemirror-example-setup';
// @ts-ignore
import {keymap} from 'prosemirror-keymap';
import './style.css';
import {useAtomValue} from "jotai/index";
import {YjsProviderAtom} from "../../TreeState/YjsConnection";
import {Node} from "../../entities";
import {XmlFragment} from 'yjs';

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
                    ].concat(exampleSetup({schema})),
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

export default ProseMirrorEditor;