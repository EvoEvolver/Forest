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


const NodeContentTabs = ({tab_dict, env_funcs, env_vars, env_components, title}) => {
    const tab_keys = Object.keys(tab_dict);
    const [value, setValue] = React.useState('0');

    const handleChange = (event: React.SyntheticEvent, newValue: string) => {
        setValue(newValue);
    };

    return <Card sx={{
            minWidth: "100%",
            maxWidth: "100%",
            minHeight: "100%",
            maxHeight: "100%",
            overflowY: 'auto',
            overflowX: 'hidden',
            wordBreak: "break-word"
        }}>
            <CardContent>
                {title && <Typography variant="h5" component="div">
                    {title}
                </Typography>}
                {tab_keys.length > 0 &&
                    <Box style={{overflowX: 'scroll', overflowY: 'auto', maxHeight: '100%'}}>
                        <TabContext value={value} key={value}>
                            <Box sx={{borderBottom: 1, borderColor: 'divider'}}>
                                <TabList onChange={handleChange} aria-label="lab API tabs example">
                                    {tab_keys.map((tab, i) => {
                                        return <Tab key={i} label={tab} value={i.toString()}/>
                                    })}
                                </TabList>
                            </Box>
                            {tab_keys.map((tab, i) => {
                                return <TabPanel value={i.toString()}>
                                    {<JsxParser
                                        bindings={{env_funcs, env_vars}}
                                        components={env_components}
                                        jsx={tab_dict[tab]}
                                        renderError={error => <div
                                            style={{color: "red"}}>{error.error.toString()}</div>}
                                    />}</TabPanel>
                            })}
                        </TabContext>
                    </Box>}
            </CardContent>
        </Card>
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


    const env_funcs = {
        modifyTree: props.modifyTree,
        send_message_to_main: (message) => {
            props.send_message_to_main({node_id: props.node.id, message})
        }
    }

    const env_vars = {
        node: props.node
    }

    const env_components = {...content_components, 'TabPanel': TabPanel}

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
                <NodeContentTabs tab_dict={node.tools[0]} env_funcs={env_funcs} env_vars={env_vars} env_components={env_components} title=""/>
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
                <NodeContentTabs tab_dict={node.tabs} env_funcs={env_funcs} env_vars={env_vars} env_components={env_components} title={node.title}/>
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
                <NodeContentTabs tab_dict={node.tools[1]} env_funcs={env_funcs} env_vars={env_vars} env_components={env_components} title=""/>
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
