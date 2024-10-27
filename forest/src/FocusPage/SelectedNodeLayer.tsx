import React, {useEffect, useState, forwardRef, useRef, useImperativeHandle} from 'react';
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


const NodeContentTabs = forwardRef(({
                                        is_content_view,
                                        tab_dict,
                                        env_funcs,
                                        env_vars,
                                        env_components,
                                        title,
                                        dark
                                    }, ref) => {
    // Remove hidden tabs from the Tabs
    const tab_keys = Object.keys(tab_dict).filter(key => key !== "relevant");
    const [value, setValue] = React.useState('0');
    const [emphasize, setEmphasize] = React.useState({'enable': false, 'keyword': '', 'wholeWord': false})
    const [visibleContent, setVisibleContent] = useState('');
    const contentRefs = useRef([]);
    const handleChange = (event: React.SyntheticEvent, newValue: string) => {
        setValue(newValue);
    };

    useImperativeHandle(ref, () => ({
        setEmphasize: (em) => {
            setEmphasize(em);
        }
    }));


    const emphasizeText = (text, keyword, wholeWord) => {
        if (!keyword || (keyword.length < 3 && !wholeWord)) return text;
        let regex = wholeWord ? new RegExp(`(?<!<[^>]*)\\b${keyword}\\b(?![^<]*>)`, 'gi') : new RegExp(`(?<!<[^>]*)${keyword}(?![^<]*>)`, 'g');
        let result = text.replace(regex, '<span key={i} style={{color: \'#d2691e\'}}>$&</span>');
        console.log(result);
        return result;
    };

    return (
        <Card sx={{
            minWidth: "100%",
            maxWidth: "100%",
            minHeight: "100%",
            maxHeight: "100%",
            overflowY: 'auto',
            overflowX: 'hidden',
            wordBreak: "break-word",
            backgroundColor: dark ? '#3b3d3e' : '#f4f4f4'
        }}>
            <CardContent>
                {title && <Typography variant="h5" component="div" style={{color: dark ? 'white' : 'black'}}>
                    {title}
                </Typography>}
                {tab_keys.length > 0 &&
                    <TabContext value={value} key={value}>
                        <Box sx={{borderBottom: 0, borderColor: 'divider'}}>
                            <TabList onChange={handleChange} aria-label="lab API tabs example">
                                {tab_keys.map((tab, i) => {
                                    return <Tab style={{color: dark ? 'white' : ''}} key={i} label={tab}
                                                value={i.toString()}/>
                                })}
                            </TabList>
                        </Box>
                        {tab_keys.map((tab, i) => {
                            return <TabPanel style={{paddingRight: "10px", paddingLeft: "10px", paddingTop: "5px"}}
                                             value={i.toString()}>
                                <Box sx={{overflowX: "auto", fontFamily: 'Verdana, sans-serif'}}>
                                    {<JsxParser
                                        bindings={{env_funcs, env_vars}}
                                        components={env_components}
                                        jsx={((tab !== 'content' && tab !== 'code') || !emphasize['enable']) ? (dark ? '<div style={{ color: \'white\' }}>' + tab_dict[tab] + '</div>' : tab_dict[tab]) : (dark ? '<div style={{ color: \'white\' }}>' + emphasizeText(tab_dict[tab], emphasize['keyword'], emphasize['wholeWord']) + '</div>' : emphasizeText(tab_dict[tab], emphasize['keyword'], emphasize['wholeWord']))}
                                        renderError={error => <div
                                            style={{color: "red"}}>{error.error.toString()}</div>}
                                    />}</Box>
                            </TabPanel>
                        })}
                    </TabContext>
                }
            </CardContent>
        </Card>
    );
})

const SelectedNodeLayer = (props) => {
    let node: Node = props.node;
    let treeData = props.treeData;
    let layouter = props.layouter;
    const [animate, setAnimate] = useState(false);
    const [currTabs, setCurrTabs] = useState({'content': 'hello'});
    useEffect(() => {

        console.log("selected node layer");
        let leaves = layouter.getAllLeaves(treeData);
        // for (const leaf of leaves) {
        //     console.log(leaf);
        // }
        console.log("whole html:");
        let i = 0;
        let wholeHtmlCode = '';

        for (const node of leaves) {
            if (node.tabs && node.tabs['content']) {
                wholeHtmlCode += `<div 
                            data-ref="content-${i}"
                            data-index="${node.id}"
                            style="margin-bottom: 10px;"
                        >`;
                wholeHtmlCode += node.tabs['content'];
                wholeHtmlCode += "</div>";
                i++;
            }
        }

        setCurrTabs({'content': wholeHtmlCode});

        const intervalId = setInterval(() => {
            const targets = document.querySelectorAll('[data-ref]');
            let left = 0;
            let right = targets.length - 1;
            let closestIndex = -1;
            let minDistance = Infinity;

            // Define a helper function to get the distance of an element's rect.y from 0
            const getDistance = (target) => {
                const rect = target.getBoundingClientRect();
                return Math.abs(rect.y-300);
            };

            // Binary search for the minimum absolute rect.y
            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                const distance = getDistance(targets[mid]);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = mid;
                }

                const rect = targets[mid].getBoundingClientRect();

                if (rect.y < 0) {
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }
            if (closestIndex !== -1) {
                const nodeId = targets[closestIndex].getAttribute('data-index');
                if(nodeId!==node.id){
                    props.modifyTree({
                    type: 'setSelectedNode',
                    id: targets[closestIndex].getAttribute('data-index')
                });
                }

            }
        }, 100);

        return () => {
            clearInterval(intervalId);
        };
    }, []);

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
        <Grid style={{height: "100%"}} container spacing={1}>
            <Grid key={0} item xs={4} style={{
                width: '30%',
                height: "100%",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeContentTabs is_content_view={false} tab_dict={node.tools[0]} env_funcs={env_funcs}
                                 env_vars={env_vars}
                                 env_components={env_components} title="" dark={props.dark}/>
            </Grid>

            <Grid key={1} item xs={4} style={{
                width: '40%',
                height: "100%",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeContentTabs is_content_view={true} tab_dict={currTabs} env_funcs={env_funcs} env_vars={env_vars}
                                 env_components={env_components} title={node.title} ref={props.contentRef}
                                 dark={props.dark}/>
            </Grid>

            <Grid key={2} item xs={4} style={{
                width: '30%',
                height: '100%',
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeContentTabs is_content_view={false} tab_dict={node.tools[1]} env_funcs={env_funcs}
                                 env_vars={env_vars}
                                 env_components={env_components} title="" dark={props.dark}/>
            </Grid>
        </Grid>

    );
};

export default SelectedNodeLayer;
