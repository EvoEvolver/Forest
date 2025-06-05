import React, {useEffect, useState} from "react";
import {usePopper} from "react-popper";

export interface Comment {
    id: string
    content: string
    replies: Comment[]
    createdAt: Date
    selection: HTMLElement | null
}

export const CommentComponent = ({comment}: { comment: Comment }) => {
    const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
    const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
    const {styles, attributes} = usePopper(referenceElement, popperElement, {
        placement: 'right',
    });

    const [isEditing, setIsEditing] = useState(true);
    const [text, setText] = useState(comment.content);

    useEffect(() => {
        setReferenceElement(comment.selection)
    }, [comment.selection]);

    return (
        <div ref={setPopperElement} style={styles.popper} {...attributes.popper}>
            <div style={{ backgroundColor: 'green', padding: '8px', borderRadius: '4px' }}>
                {isEditing ? (
                    <div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            style={{ width: '200px', height: '80px' }}
                        />
                        <br/>
                        <button onClick={() => setIsEditing(false)}>Save</button>
                    </div>
                ) : (
                    <div>
                        <p>{text}</p>
                        <button onClick={() => setIsEditing(true)}>Edit</button>
                    </div>
                )}
            </div>
        </div>
    );
};
