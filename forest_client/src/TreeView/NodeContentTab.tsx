import React, {createContext, useEffect} from "react";
import JsxParser from "react-jsx-parser";
import TabContext from "@mui/lab/TabContext";
import {Box} from "@mui/material";
import TabList from "@mui/lab/TabList";
import Tab from "@mui/material/Tab";
import TabPanel from "@mui/lab/TabPanel";
import Typography from "@mui/material/Typography";
import {envComponentAtom} from "./ContentComponents";
import {useAtomValue} from "jotai";
import {darkModeAtom} from "../TreeState/TreeState";

export const thisNodeContext = createContext(null)


const renderTabs = (tabs, node) => {
    const [value, setValue] = React.useState('0');
    const dark = useAtomValue(darkModeAtom);
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
                        {renderContent(tabs[tab], node)}
                    </Box>
                </TabPanel>
            ))}
        </TabContext>
    </>
}

export const NodeContentTabs = ({node, tabDict, title}) => {
    const dark = useAtomValue(darkModeAtom)
    return (
        <>{
            title && <Typography variant="h5" style={{color: dark ? 'white' : 'black'}}>{title}</Typography>}{renderTabs(tabDict, node)}
        </>
    );
}