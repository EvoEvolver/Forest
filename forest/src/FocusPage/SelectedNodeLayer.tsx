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
import {Node} from "../entities";


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
                                <Box sx={{overflowX: "auto"}}>
                                {<JsxParser
                                    bindings={{env_funcs, env_vars}}
                                    components={env_components}
                                    jsx={tab_dict[tab]}
                                    renderError={error => <div
                                        style={{color: "red"}}>{error.error.toString()}</div>}
                                />}</Box>
                            </TabPanel>
                        })}
                    </TabContext>
                }
            </CardContent>
        </Card>
}

const SelectedNodeLayer = (props) => {
    let node: Node = props.node;
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
        <Grid style={{height: "100%"}} container spacing={2}>

            <Grid key={0} item xs={4} style={{
                width: '30%',
                height: "100%",
                paddingBottom: '10px',
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeContentTabs tab_dict={node.tools[0]} env_funcs={env_funcs} env_vars={env_vars} env_components={env_components} title=""/>
            </Grid>

            <Grid key={1} item xs={4} style={{
                width: '40%',
                paddingBottom: '10px',
                height: "100%",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeContentTabs tab_dict={node.tabs} env_funcs={env_funcs} env_vars={env_vars} env_components={env_components} title={node.title}/>
            </Grid>

            <Grid key={2} item xs={4} style={{
                width: '30%',
                paddingBottom: '10px',
                height: '100%',
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeContentTabs tab_dict={node.tools[1]} env_funcs={env_funcs} env_vars={env_vars} env_components={env_components} title=""/>
            </Grid>
        </Grid>

    );
};

export default SelectedNodeLayer;
