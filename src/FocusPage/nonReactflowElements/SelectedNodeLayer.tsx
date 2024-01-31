import React, {useCallback, useEffect, useState} from 'react';
import {Grid} from '@mui/material';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import JsxParser from 'react-jsx-parser'
import Select from 'react-select';
import {CopyBlock} from 'react-code-blocks';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

const NodeElement = (props) => {
    let tabs = Object.keys(props.node.data.tabs);
    let options = tabs.map((tab) => {
        return {value: tab, label: tab}
    });
    // assign tab state to tabs[0] if tabs has length > 0.
    const [selectedTab, setSelectedTab] = useState(options.length > 0 ? options[0] : null);
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
                        <Select
                            classNamePrefix="select"
                            defaultValue={options[0]}
                            name="tabs"
                            value={selectedTab}
                            options={options}
                        />
                        <Typography variant="body2">
                            {props.node.data.tabs[selectedTab['value']] &&
                                <JsxParser
                                    bindings={{props}}
                                    components={{CopyBlock}}
                                    jsx={props.node.data.tabs[selectedTab['value']]}
                                />}
                        </Typography>
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
                Tool 1
            </Grid>

            <Grid key={1} item xs style={{
                width: '50%',
                height: "100%",
                margin: "0 0px",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeElement node={node}/>
            </Grid>

            <Grid key={2} item xs
                  style={{width: '25%', border: '1px solid black', height: "100%", margin: "0 20px"}}>
                Tool 2
            </Grid>
        </Grid>
    );
};

export default SelectedNodeLayer;
