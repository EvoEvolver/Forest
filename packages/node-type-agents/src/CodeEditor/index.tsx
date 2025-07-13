import React, { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { yCollab } from 'y-codemirror.next';

interface CollaborativeEditorProps {
    yText: Y.Text;
    langExtension: any;
}

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({ yText, langExtension }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        // Create undo manager for Yjs
        const yUndoManager = new Y.UndoManager(yText);

        // Create editor state with collaborative extensions
        const state = EditorState.create({
            doc: yText.toString(),
            extensions: [
                basicSetup,
                langExtension(),
                yCollab(yText, { undoManager: yUndoManager }),
                EditorView.lineWrapping,
                EditorView.theme({
                    "&": {
                        height: "100%"
                    }
                })
            ]
        });

        // Create editor view
        const view = new EditorView({
            state,
            parent: editorRef.current
        });

        viewRef.current = view;

        // Cleanup function
        return () => {
            view.destroy();
            yUndoManager.destroy();
        };
    }, [yText]);

    return (
        <div className="collaborative-editor">
            <div ref={editorRef} style={{ height: '100%' }} />
        </div>
    );
};

export default CollaborativeEditor;