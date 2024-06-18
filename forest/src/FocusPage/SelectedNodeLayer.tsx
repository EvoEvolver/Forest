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
import {Code, TeX} from "./ContentComponents";
import Chatbot from "./Plugins/Chatbot";
import NodeNavigateButton from "./NodeNavigateButton";

const NodeElement = (props) => {
    let tabs = Object.keys(props.node.data.tabs);
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
                <Typography variant="h5" component="div">
                    {props.node.data.label}
                </Typography>
                {tabs.length > 0 &&
                    <Box style={{overflowX: 'scroll', overflowY: 'auto', maxHeight: '100%'}}>
                        <TabContext value={value} key={{value}}>
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
                                        bindings={{modifyTree}}
                                        components={{Code, TeX, NodeNavigateButton}}
                                        jsx={props.node.data.tabs[tab]}
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
            <Grid key={0} item xs
                  style={{width: '25%', border: '1px solid black', height: "100%", margin: "0 20px"}}>
                <Chatbot/>
            </Grid>

            <Grid key={1} item xs style={{
                width: '50%',
                height: "100%",
                margin: "0 0px",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeElement node={node} modifyTree={props.modifyTree}/>
            </Grid>

            <Grid key={2} item xs
                  style={{width: '25%', border: '1px solid black', height: "100%", margin: "0 20px"}}>
                Tool 2
            </Grid>
        </Grid>

    );
};

export default SelectedNodeLayer;
