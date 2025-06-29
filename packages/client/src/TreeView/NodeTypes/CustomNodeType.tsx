import {NodeType, NodeVM} from "@forest/schema"
import React, {ReactNode} from "react";
import JsxParser from "react-jsx-parser";
import TabContext from "@mui/lab/TabContext";
import {Box} from "@mui/material";
import TabList from "@mui/lab/TabList";
import Tab from "@mui/material/Tab";
import TabPanel from "@mui/lab/TabPanel";
import { componentsForCustomNode } from "@forest/node-components";


const renderTabs = (tabs, node: NodeVM) => {
    const [value, setValue] = React.useState('0');
    const handleChange = (event, newValue) => setValue(newValue);
    const envComponent = componentsForCustomNode

    // @ts-ignore
    const renderContent = (content, node) => {
        const handleRenderError = (error) => (<>
            <div style={{color: "red"}}>{error.error.toString()}</div>
            <div>{content}</div>
        </>)
        return <>
            {/* @ts-expect-error */}
            <JsxParser
                components={envComponent}
                jsx={content}
                renderError={handleRenderError}
            />
        </>
    }
    if (!tabs) return <></>
    return <>
        <TabContext value={value}>
            {tabs.length > 1 && <Box sx={{borderBottom: 0, borderColor: 'divider'}}>
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

interface CustomNodeData {
    tabs: Record<string, string>,
    tools: Record<string, string>[]
}

export class CustomNodeType extends NodeType {
    render(node: NodeVM): ReactNode {
        //const data = node.data as CustomNodeData
        const tabs = node.tabs
        return renderTabs(tabs, node)
    }

    renderTool1(node: NodeVM): ReactNode {
        //const data = node.data as CustomNodeData
        const tabs = node.tools[0]
        return renderTabs(tabs, node)
    }

    renderTool2(node: NodeVM): ReactNode {
        //const data = node.data as CustomNodeData
        const tabs = node.tools[1]
        return renderTabs(tabs, node)
    }

    renderPrompt(node: NodeVM): string {
        return ""
    }

    ydataInitialize(node: NodeVM) {

    }

}