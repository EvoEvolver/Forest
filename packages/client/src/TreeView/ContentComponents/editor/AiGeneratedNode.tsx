import {mergeAttributes, Node} from '@tiptap/core'; // Added Editor, RawCommands for clarity if needed elsewhere, not strictly for augmentation
import {NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react';
import React from 'react';

export const AiGenerated = Node.create({
    name: 'aiGenerated',
    group: 'inline',
    content: 'text*',
    inline: true,
    selectable: true,
    atom: false,

    addAttributes() {
        return {};
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="ai-generated"]',
            },
        ];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-type': 'ai-generated'}), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(AiGeneratedNodeView);
    },
});

const AiGeneratedNodeView = (props) => {
    return (
        <NodeViewWrapper
            as="span"
            className="ai-generated-node relative inline-block"
            style={{
                backgroundColor: '#87caff',
                padding: '1px 4px',
                borderRadius: '4px',
                margin: '0 1px',
            }}
        >
            <NodeViewContent
                as="span"
                className="content"
            />
        </NodeViewWrapper>
    );
};