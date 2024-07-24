import React, {useEffect, useState} from 'react';
import {Grid} from '@mui/material';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import JsxParser from 'react-jsx-parser'
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import * as content_components from "./ContentComponents";
import Chatbot from "./Plugins/Chatbot";

const NodeElement = (props) => {
    let tabs = Object.keys(props.node.tabs);
    let options = tabs.map((tab) => {
        return tab
    });
    // assign tab state to tabs[0] if tabs has length > 0.
    //const [selectedTab, setSelectedTab] = useState(options.length > 0 ? options[0] : null);
    const [value, setValue] = React.useState('0');

    const handleChange = (event: React.SyntheticEvent, newValue: string) => {
        setValue(newValue);
    };

    let modifyTree = props.modifyTree;

    const env_funcs = {
        modifyTree: modifyTree,
        send_message_to_main: (message) => {
            props.send_message_to_main({node_id: props.node.id, message})
        }
    }

    const env_vars = {
        node: props.node
    }

    const env_components = {...content_components}

    // TODO: why is it rendered multiple times?
    return (
        <Card sx={{
            minWidth: "100%",
            maxWidth: "100%",
            minHeight: "100%",
            maxHeight: "100%",
            overflowY: 'auto',
            overflowX: 'hidden',
            wordBreak: "break-word",
            backgroundColor: '#f4f4f4'
        }}>
            <CardContent>
                <Typography variant="h5" component="div">
                    {props.node.title}
                </Typography>
                {tabs.length > 0 &&
                    <Box style={{overflowX: 'scroll', overflowY: 'auto', maxHeight: '100%', margin: '30px'}}>
                            {/*<TabPanel value={"0"}>*/}
                                {<JsxParser
                                    bindings={{env_funcs, env_vars}}
                                    components={env_components}
                                    jsx={props.node.tabs["content"]}
                                    renderError={error => <div
                                        style={{color: "red"}}>{error.error.toString()}</div>}
                                />}
                    </Box>}
            </CardContent>
        </Card>
    );
}

const SummaryElement = (props) => {
    let tabs = ['summary'];
    let options = tabs.map((tab) => {
        return tab
    });
    // assign tab state to tabs[0] if tabs has length > 0.
    //const [selectedTab, setSelectedTab] = useState(options.length > 0 ? options[0] : null);
    const [value, setValue] = React.useState('0');

    const handleChange = (event: React.SyntheticEvent, newValue: string) => {
        setValue(newValue);
    };

    let modifyTree = props.modifyTree;

    const env_funcs = {
        modifyTree: modifyTree,
        send_message_to_main: (message) => {
            props.send_message_to_main({node_id: props.node.id, message})
        }
    }

    const env_vars = {
        node: props.node
    }

    const env_components = {...content_components}

    // TODO: why is it rendered multiple times?
    return (
        <Card sx={{
            minWidth: "100%",
            maxWidth: "100%",
            minHeight: "100%",
            maxHeight: "100%",
            overflowY: 'auto',
            overflowX: 'hidden',
            wordBreak: "break-word"
        }}>
            <CardContent>
                {tabs.length > 0 &&
                    <Box style={{overflowX: 'scroll', overflowY: 'auto', maxHeight: '100%'}}>
                        <TabContext value={value} key={value}>
                            <Box sx={{borderBottom: 1, borderColor: 'divider'}}>
                                <TabList onChange={handleChange} aria-label="lab API tabs example">
                                    {tabs.map((tab, i) => {
                                        return <Tab key={i} label={tab} value={i.toString()}/>
                                    })}
                                </TabList>
                            </Box>
                            {tabs.map((tab, i) => {
                                return <TabPanel value={i.toString()}>
                                    {<JsxParser
                                        bindings={{env_funcs, env_vars}}
                                        components={env_components}
                                        jsx={props.node.tabs[tab]}
                                        renderError={error => <div
                                            style={{color: "red"}}>{error.error.toString()}</div>}
                                    />}</TabPanel>
                            })}
                        </TabContext>
                    </Box>}
            </CardContent>
        </Card>
    );
}

const TabElement = (props) => {
    let tabs = Object.keys(props.node.tabs).filter(key => key !== 'content' && key !== 'summary');
    let options = tabs.map((tab) => {
        return tab
    });
    // assign tab state to tabs[0] if tabs has length > 0.
    //const [selectedTab, setSelectedTab] = useState(options.length > 0 ? options[0] : null);
    const [value, setValue] = React.useState('0');

    const handleChange = (event: React.SyntheticEvent, newValue: string) => {
        setValue(newValue);
    };

    let modifyTree = props.modifyTree;

    const env_funcs = {
        modifyTree: modifyTree,
        send_message_to_main: (message) => {
            props.send_message_to_main({node_id: props.node.id, message})
        }
    }

    const env_vars = {
        node: props.node
    }

    const env_components = {...content_components}

    // TODO: why is it rendered multiple times?
    return (
        <Card sx={{
            minWidth: "100%",
            maxWidth: "100%",
            minHeight: "100%",
            maxHeight: "100%",
            overflowY: 'auto',
            overflowX: 'hidden',
            wordBreak: "break-word"
        }}>
            <CardContent>
                {
                    <Box style={{overflowX: 'scroll', overflowY: 'auto', maxHeight: '100%'}}>
                        <TabContext value={value} key={value}>
                            <Box sx={{borderBottom: 1, borderColor: 'divider'}}>
                                <TabList onChange={handleChange} aria-label="lab API tabs example">
                                    {tabs.map((tab, i) => {
                                        return <Tab key={i} label={tab} value={i.toString()}/>
                                    })}
                                </TabList>
                            </Box>
                            {tabs.map((tab, i) => {
                                return <TabPanel value={i.toString()}>
                                    {<JsxParser
                                        bindings={{env_funcs, env_vars}}
                                        components={env_components}
                                        jsx={props.node.tabs[tab]}
                                        renderError={error => <div
                                            style={{color: "red"}}>{error.error.toString()}</div>}
                                    />}</TabPanel>
                            })}
                        </TabContext>
                    </Box>}
            </CardContent>
        </Card>
    );
}

const SelectedNodeLayer = (props) => {
    let node = props.node;
    let number = 3;
    //const elementWidth = `${100 / number}%`;
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setAnimate(true);
        const timeoutId = setTimeout(() => {
            setAnimate(false);
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [node]);

    return (
        <Grid style={{height: "100%"}} container>
            {/*<Grid key={0} item xs*/}
            {/*      style={{width: '30%', border: '1px solid black', height: "100%", margin: "0 20px", flex: "0 0 30%"}}>*/}
            {/*    <Chatbot/>*/}
            {/*</Grid>*/}

            <Grid key={0} item xs style={{
                width: '30%',
                height: "100%",
                paddingBottom: '10px',
                margin: "10px",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
                flex: "0 1 28%",
            }}>
                <SummaryElement node={node} modifyTree={props.modifyTree}
                            send_message_to_main={props.send_message_to_main}/>
            </Grid>

            <Grid key={1} item xs style={{
                width: '40%',
                paddingBottom: '10px',
                height: "100%",
                margin: "10px",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
                flex: "1 1 35%"
            }}>
                <NodeElement node={node} modifyTree={props.modifyTree}
                             send_message_to_main={props.send_message_to_main}/>
            </Grid>

            <Grid key={2} item xs style={{
                width: '30%',
                paddingBottom: '10px',
                height: '100%',
                margin: "10px",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
                flex: "0 1 28%"
            }}>
                <TabElement node={node} modifyTree={props.modifyTree}
                            send_message_to_main={props.send_message_to_main}/>
            </Grid>
x
            {/*<Grid key={2} item xs*/}
            {/*      style={{width: '30%', border: '1px solid black', height: "100%", margin: "0 20px", flex: "0 0 30%"}}>*/}
            {/*    Tool 2*/}
            {/*</Grid>*/}
        </Grid>

    );
};

export default SelectedNodeLayer;
