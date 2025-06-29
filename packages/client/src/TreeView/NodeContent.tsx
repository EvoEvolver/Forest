import React, {Context, createContext} from "react";
import JsxParser from "react-jsx-parser";
import TabContext from "@mui/lab/TabContext";
import {Box} from "@mui/material";
import TabList from "@mui/lab/TabList";
import Tab from "@mui/material/Tab";
import TabPanel from "@mui/lab/TabPanel";
import {envComponentAtom} from "../../../node-components"
import {NodeVM} from "@forest/schema";

export const thisNodeContext: Context<NodeVM> = createContext(null)


export const renderTabs = (tabs, node) => {
    const [value, setValue] = React.useState('0');
    const handleChange = (event, newValue) => setValue(newValue);
    const envComponent = envComponentAtom

    const renderContent = (content, node) => (
        <thisNodeContext.Provider value={node}>
            <JsxParser
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
