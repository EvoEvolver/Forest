import React, {useContext} from 'react';
import {EditorComponent, Remirror, ThemeProvider, useRemirror,} from '@remirror/react';
import {XmlFragment} from 'yjs';
import {YjsExtension} from './yjs-extension';
import {useAtomValue} from "jotai";
import {YjsProviderAtom} from "../../../TreeState/YjsConnection";
import {thisNodeContext} from "../../NodeContentTab";

export default function RemirrorEditor(props) {
    const node = useContext(thisNodeContext)
    const provider = useAtomValue(YjsProviderAtom)
    const ydataLabel = props.label || "";
    const ydataKey = "ydata" + ydataLabel;
    let yXML = node.ydata.get(ydataKey);
    if (!yXML) {
        yXML = new XmlFragment();
        node.ydata.set(ydataKey, yXML);
    }

    const {manager, state} = useRemirror({
        extensions: () => [
            new YjsExtension({
                getProvider: () => provider,
                xmlFragment: yXML,
                syncPluginOptions: {
                    disableCollaboration: false,
                    disableUndo: false,
                },
            })
        ],
        content: '',
        selection: 'start',
        stringHandler: 'html',
    });

    return (
        <ThemeProvider>
            <Remirror manager={manager} initialContent={state}>
                <EditorComponent/>
            </Remirror>
        </ThemeProvider>
    );
}