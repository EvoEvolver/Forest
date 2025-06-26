import React, {Context, createContext, useEffect} from "react";
import JsxParser from "react-jsx-parser";
import TabContext from "@mui/lab/TabContext";
import {Box} from "@mui/material";
import TabList from "@mui/lab/TabList";
import Tab from "@mui/material/Tab";
import TabPanel from "@mui/lab/TabPanel";
import Typography from "@mui/material/Typography";
import {useAtomValue} from "jotai";
import {Node} from "../TreeState/entities"
import {envComponentAtom} from "@forest/node-type-custom"

export const thisNodeContext: Context<Node> = createContext(null)


const renderTabs = (tabs, node) => {
    const [value, setValue] = React.useState('0');
    const handleChange = (event, newValue) => setValue(newValue);
    const envComponent = useAtomValue(envComponentAtom)

    const renderContent = (content, node) => (
        <thisNodeContext.Provider value={node}>
            <JsxParser
                bindings={{
                    node: node
                }}
                components={envComponent}
                jsx={content}
                renderError={error => <><div style={{color: "red"}}>{error.error.toString()}</div><div>{content}</div></>}
        /></thisNodeContext.Provider>
    );
    if (!tabs) return <></>
    return <>
        <TabContext value={value}>
            {tabs.length>1&&<Box sx={{borderBottom: 0, borderColor: 'divider'}}>
                {<TabList onChange={handleChange}>
                    {Object.keys(tabs).map((tab, i) => (
                        <Tab key={i} label={tab} value={i.toString()}/>
                    ))}
                </TabList>}
            </Box>}
            {Object.keys(tabs).map((tab, i) => (
                <TabPanel key={i} value={i.toString()} sx={{padding: "5px 10px"}}>
                    <Box sx={{overflowX: "auto", fontFamily: 'Verdana, sans-serif'}}>
                        {renderContent(tabs[tab], node)}
                    </Box>
                </TabPanel>
            ))}
        </TabContext>
    </>
}

import { useState } from "react";
import TextField from "@mui/material/TextField";

export const NodeContentTabs = ({node, tabDict, titleAtom}) => {
    const [isEditing, setIsEditing] = useState(false);
    let title
    if (titleAtom){
        title = useAtomValue(titleAtom);
    }
    const [editedTitle, setEditedTitle] = useState("");
    useEffect(() => {
        if (titleAtom){
            if (title) {
                setEditedTitle(title)
            }
        }
    }, []);

    if (titleAtom){
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
        node.ymapForNode.set("title", editedTitle);
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
            {renderTabs(tabDict, node)}
        </>
    );
};