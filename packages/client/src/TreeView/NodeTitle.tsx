import React, {useEffect, useState} from "react";
import {useAtomValue} from "jotai/index";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { NodeVM } from "@forest/schema";

export const NodeTitle = ({node}: { node: NodeVM }) => {
    const [isEditing, setIsEditing] = useState(false);
    const titleAtom = node.title
    const title = useAtomValue(node.title);

    const [editedTitle, setEditedTitle] = useState("");
    useEffect(() => {
        if (titleAtom) {
            if (title) {
                setEditedTitle(title)
            }
        }
    }, []);

    if (titleAtom) {
        useEffect(() => {
            if (title) {
                setEditedTitle(title)
            }
        }, [title]);
    }

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
    };

    const handleChange = (event) => {
        setEditedTitle(event.target.value);
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            setIsEditing(false);
        }
    };

    useEffect(() => {
        if (!titleAtom) return
        if (isEditing) return;
        if (editedTitle === title) return;
        if (!editedTitle) return;
        node.nodeM.ymap.set("title", editedTitle);
    }, [isEditing]);

    return (
        <>{
            title && (
                isEditing ? (
                    <TextField
                        value={editedTitle}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onKeyPress={handleKeyPress}
                        variant="standard"
                        fullWidth
                        autoFocus
                        sx={{
                            '& .MuiInputBase-input': {
                                fontSize: '1.5rem',
                                fontWeight: 400,
                                lineHeight: 1.334,
                                letterSpacing: '0em',
                            }
                        }}
                    />
                ) : (
                    <Typography
                        variant="h5"
                        onDoubleClick={handleDoubleClick}
                        style={{"paddingBottom": "5px", "cursor": "pointer"}}
                    >
                        {title}
                    </Typography>
                )
            )}
        </>
    );
};