import React, {useContext, useEffect, useRef, useState} from 'react'
import './style.css';
import {useAtomValue} from "jotai";
import {YjsProviderAtom} from "../../../TreeState/YjsConnection";
import {XmlFragment} from 'yjs';
import {thisNodeContext} from "../../NodeContentTab";
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import {BubbleMenu, EditorContent, useEditor} from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Image from '@tiptap/extension-image'
import {CommentExtension} from './Extensions/comment'
import {MathExtension} from '@aarkue/tiptap-math-extension'
import Bold from '@tiptap/extension-bold'
import {Button, Card, Menu, TextField} from "@mui/material";
import {usePopper} from "react-popper";

// get if the current environment is development or production
// @ts-ignore
const isDevMode = (import.meta.env.MODE === 'development');
if (isDevMode) {
    console.warn("This is dev mode. Experimental features are enabled.");
}

interface TiptapEditorProps {
    label?: string
}


const TiptapEditor = (props: TiptapEditorProps) => {
    const node = useContext(thisNodeContext)
    const provider = useAtomValue(YjsProviderAtom)
    const ydataLabel = props.label || "";
    // This cannot be edited because it will break the existing docs
    const ydataKey = "ydata" + ydataLabel;
    let yXML = node.ydata.get(ydataKey);
    if (!yXML) {
        yXML = new XmlFragment();
        node.ydata.set(ydataKey, yXML);
    }
    return <>
        <EditorImpl yXML={yXML} provider={provider} dataLabel={ydataLabel}/>
    </>

};

export default TiptapEditor;

const CommentHover = ({hoveredEl, editor}) => {
    const commentId = hoveredEl.getAttribute("data-comment-id");
    const [editedComment, setEditedComment] = useState(hoveredEl.getAttribute("data-comment"));
    const handleCommentUpdate = () => {
        editor.commands.updateComment(commentId, editedComment);
    };

    const removeHover = () => {
        const commentExtension = editor.extensionManager.extensions.find(ext => ext.name === 'comment');
        commentExtension.options.onCommentActivated(null);
    }

    const handleCommentRemove = () => {
        editor.commands.unsetComment(commentId);
        removeHover()
    };

    return (
        <Card sx={{width: 'fit-content', p: 1}}>
            <TextField
                size="small"
                value={editedComment}
                onChange={(e) => setEditedComment(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleCommentUpdate()
                        removeHover()
                        e.preventDefault(); // Prevents the default behavior of adding a new line
                    }
                }}
                onBlur={handleCommentUpdate}
            />
            <Button
                variant="contained"
                size="small"
                color="error"
                onClick={handleCommentRemove}
                sx={{ml: 1}}
            >
                Remove
            </Button>
        </Card>
    );
};

const EditorImpl = ({yXML, provider, dataLabel}) => {
    let editor = null;
    const editorDivRef = useRef<HTMLDivElement>(null);

    const extensions = [
        Document,
        Paragraph,
        Text,
        BulletList,
        OrderedList,
        ListItem,
        Image,
        Bold,
        MathExtension.configure({evaluation: false}),
        Collaboration.extend().configure({
            fragment: yXML,
        }),
        CollaborationCursor.extend().configure({
            provider,
        }),
    ]

    const [hoverElements, setHoverElements] = useState([]);

    const onCommentActivated = (commentId) => {
            if (!commentId) {
                setHoverElements([]);
                return;
            }
            const el = editorDivRef.current?.querySelector(`[data-comment-id="${commentId}"]`);
            console.log(el)
            setHoverElements(prev => {
                if (el) {
                    return [{
                        el: el,
                        render: (el, editor) => <CommentHover hoveredEl={el} editor={editor}/>
                    }];
                }
                return prev;
            })
        }

    const commentExtension = CommentExtension.configure({
        HTMLAttributes: {
            class: "comment",
        },
        onCommentActivated: onCommentActivated,
    })
    // @ts-ignore
    extensions.push(commentExtension)
    // Inside EditorImpl component, add these state variables
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [commentText, setCommentText] = useState('');

    // Add these handlers
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleCommentSubmit = () => {
        const id = `comment-${Date.now()}`;
        editor?.commands.setComment(id, commentText);
        setCommentText('');
        handleClose();
    };


    editor = useEditor({
        enableContentCheck: true,
        onContentError: ({disableCollaboration}) => {
            disableCollaboration()
        },
        onCreate: ({editor: currentEditor}) => {
            /*provider.on('synced', () => {
                if (currentEditor.isEmpty) {
                    currentEditor.commands.setContent("")
                }
            })*/
        },
        extensions: extensions,
    })

    const node = useContext(thisNodeContext)
    useEffect(() => {
        const editorFieldName = "tiptap_editor_" + dataLabel;
        node.data[editorFieldName] = editor
        return () => {
            editor.destroy();
        }
    }, []);
    if (!editor) {
        return null
    }

    return (
        <div className="column-half">
            <div ref={editorDivRef}>
                <EditorContent editor={editor} className="main-group"/>
            </div>
            <BubbleMenu editor={editor} tippyOptions={{duration: 100}}>
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    Bold
                </Button>
                <Button variant="contained" size="small" onClick={handleClick}>Comment</Button><Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                <div style={{padding: '16px'}}>
                    <TextField
                        size="small"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Enter your comment"
                    />
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleCommentSubmit}
                        sx={{marginLeft: 1}}
                    >Submit
                    </Button>
                </div>
            </Menu>
            </BubbleMenu>
            <HoverElements hoverElements={hoverElements} editor={editor}/>
        </div>
    )
}
const HoverElements = ({hoverElements, editor}) => {
    const [referenceElement, setReferenceElement] = useState(null);
    const [popperElement, setPopperElement] = useState(null);

    const {styles, attributes} = usePopper(referenceElement, popperElement, {
        placement: 'top-start',
        modifiers: [
            {
                name: 'offset',
                options: {
                    offset: [0, 8],
                },
            },
        ],
    });

    useEffect(() => {
        if (hoverElements.length > 0) {
            setReferenceElement(hoverElements[0].el);
        }
    }, [hoverElements]);

    return (
        <>
            {hoverElements.map((el, index) => {
                const {render} = el;
                return (
                    <div
                        ref={setPopperElement}
                        style={{...styles.popper, zIndex: 99}}
                        {...attributes.popper}
                        key={index}
                    >
                        {render(el.el, editor)}
                    </div>
                );
            })}
        </>
    );
};