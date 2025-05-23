import React from "react";
import JsxParser from "react-jsx-parser";
import TabContext from "@mui/lab/TabContext";
import Box from "@mui/material/Box";
import TabList from "@mui/lab/TabList";
import Tab from "@mui/material/Tab";
import TabPanel from "@mui/lab/TabPanel";
import Typography from "@mui/material/Typography";
import * as content_components from "./ContentComponents";
import {atom, useAtomValue} from "jotai";
import {darkModeAtom} from "../TreeState";
import Tooltip from '@mui/material/Tooltip';

const envComponentAtom = atom({...content_components, Tooltip, Box})

const renderTabs = (tabs) => {
    const [value, setValue] = React.useState('0');
    const [emphasize, setEmphasize] = React.useState({enable: false, keyword: '', wholeWord: false});
    const dark = useAtomValue(darkModeAtom);
    const handleChange = (event, newValue) => setValue(newValue);

    const emphasizeText = (text, keyword, wholeWord) => {
        if (!keyword || (keyword.length < 3 && !wholeWord)) return text;
        const regex = wholeWord
            ? new RegExp(`(?<!<[^>]*)\\b${keyword}\\b(?![^<]*>)`, 'gi')
            : new RegExp(`(?<!<[^>]*)${keyword}(?![^<]*>)`, 'g');
        return text.replace(regex, '<span style="color: #d2691e;">$&</span>');
    };

    //useImperativeHandle(ref, () => ({
    //    setEmphasize: (em) => setEmphasize(em)
    // }));
    const envComponent = useAtomValue(envComponentAtom)

    const renderContent = (content, applyEmphasis) => (
        <JsxParser
            components={envComponent}
            jsx={dark ? `<div style="color: white;">${applyEmphasis ? emphasizeText(content, emphasize.keyword, emphasize.wholeWord) : content}</div>`
                : (applyEmphasis ? emphasizeText(content, emphasize.keyword, emphasize.wholeWord) : content)
            }
            renderError={error => <><div style={{color: "red"}}>{error.error.toString()}</div><div>{content}</div></>}
        />
    );
    if (!tabs) return <></>
    return <>
        <TabContext value={value}>
            <Box sx={{borderBottom: 0, borderColor: 'divider'}}>
                <TabList onChange={handleChange}>
                    {Object.keys(tabs).map((tab, i) => (
                        <Tab style={{color: dark ? 'white' : ''}} key={i} label={tab} value={i.toString()}/>
                    ))}
                </TabList>
            </Box>
            {Object.keys(tabs).map((tab, i) => (
                <TabPanel key={i} value={i.toString()} sx={{padding: "5px 10px"}}>
                    <Box sx={{overflowX: "auto", fontFamily: 'Verdana, sans-serif'}}>
                        {renderContent(tabs[tab], dark, emphasize.enable && (tab === 'content' || tab === 'code'))}
                    </Box>
                </TabPanel>
            ))}
        </TabContext>
    </>
}

export const NodeContentTabs = ({node, tabDict, title}) => {

    const dark = useAtomValue(darkModeAtom)
    //const selectedNode = useAtomValue(selectedNodeAtom)


    return (
        <>
            {title && <Typography variant="h5" style={{color: dark ? 'white' : 'black'}}>{title}</Typography>}
            {renderTabs(tabDict)}
        </>
    );
}