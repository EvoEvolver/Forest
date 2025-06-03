import { Node, mergeAttributes, Editor, NodeType, RawCommands } from '@tiptap/core'; // Added Editor, NodeType, RawCommands for clarity if needed elsewhere, not strictly for augmentation
import { ReactNodeViewRenderer } from '@tiptap/react';
import React, { useState, useCallback } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';

// Add this module augmentation
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setAiGenerated: () => ReturnType;
    unsetAiGenerated: () => ReturnType;
    toggleAiGenerated: () => ReturnType;
  }
}

export const AiGenerated = Node.create({
  name: 'aiGenerated',
  group: 'inline',
  content: 'text*',
  inline: true,
  selectable: true,
  atom: false,
  draggable: true,

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

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'ai-generated' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AiGeneratedNodeView);
  },

  addCommands() {
    return {
      setAiGenerated: () => ({ commands }) => {
        return commands.wrapIn(this.name);
      },
      unsetAiGenerated: () => ({ commands }) => {
        return commands.lift(this.name);
      },
      toggleAiGenerated: () => ({ commands }) => {
        return commands.toggleWrap(this.name);
      },
    };
  },
});

// ... rest of your AiGeneratedNodeView component
const AiGeneratedNodeView = (props) => {
  const { node, editor, getPos, deleteNode } = props;
  const [isHovered, setIsHovered] = useState(false);

  const handleAccept = useCallback(() => {
    if (typeof getPos !== 'function') {
      console.error("getPos is not a function in AiGeneratedNodeView");
      return;
    }
    const currentPos = getPos();
    if (typeof currentPos !== 'number' || currentPos < 0) {
      console.error("Invalid position for AiGeneratedNodeView for accept action");
      return;
    }

    const range = { from: currentPos, to: currentPos + node.nodeSize };
    const textContent = node.textContent;

    editor.chain().focus()
        .deleteRange(range)
        .insertContentAt(range.from, textContent)
        .run();
  }, [editor, node, getPos]);

  const handleRemoveMark = useCallback(() => {
    if (typeof deleteNode === 'function') {
      deleteNode();
    } else {
      console.warn("deleteNode function not available. Falling back to editor command.");
      if (typeof getPos === 'function') {
        const currentPos = getPos();
        if (typeof currentPos === 'number' && currentPos >= 0) {
          const range = { from: currentPos, to: currentPos + node.nodeSize };
          editor.chain().focus().deleteRange(range).run();
        }
      }
    }
  }, [deleteNode, editor, node, getPos]);

  const keepHovered = () => setIsHovered(true);
  const checkMouseLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget) && !e.relatedTarget?.closest('.ai-generated-buttons')) {
      setIsHovered(false);
    }
  };

  return (
      <NodeViewWrapper
          as="span"
          className="ai-generated-node relative inline-block"
          style={{
            backgroundColor: 'rgba(173, 216, 230, 0.6)',
            padding: '1px 4px',
            borderRadius: '4px',
            margin: '0 1px',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={checkMouseLeave}
      >
        <NodeViewContent
            as="span"
            className="content"
        />
        {isHovered && (
            <div
                className="ai-generated-buttons absolute flex items-center space-x-1.5 bg-white p-1.5 shadow-lg rounded-md border border-gray-200"
                style={{
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%) translateY(-5px)',
                  zIndex: 50,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={keepHovered}
                onMouseLeave={() => setIsHovered(false)}
            >
              <button
                  type="button"
                  onClick={handleAccept}
                  title="Accept: Convert to regular text"
                  className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors"
              >
                Accept
              </button>
              <button
                  type="button"
                  onClick={handleRemoveMark}
                  title="Unmark: Remove this AI highlight"
                  className="px-2.5 py-1 text-xs font-medium text-white bg-slate-500 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75 transition-colors"
              >
                Unmark
              </button>
            </div>
        )}
      </NodeViewWrapper>
  );
};