import React, {useEffect, useState, forwardRef, useRef, useImperativeHandle} from 'react';
import {Button, Grid} from '@mui/material';
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
import './SelectedNodeLayer.css';

const NodeContentTabs = forwardRef(({
                                        leaves,
                                        tab_dict,
                                        env_funcs,
                                        env_vars,
                                        env_components,
                                        title,
                                        dark,
                                        onLeftBtn,
                                        onRightBtn
                                    }, ref) => {
    // Remove hidden tabs from the Tabs
    const tabKeys = Object.keys(tab_dict).filter(key => key !== "relevant");
    const [value, setValue] = React.useState('0');
    const [emphasize, setEmphasize] = React.useState({enable: false, keyword: '', wholeWord: false});

    useImperativeHandle(ref, () => ({
        setEmphasize: (em) => setEmphasize(em)
    }));

    const handleChange = (event, newValue) => setValue(newValue);

    const emphasizeText = (text, keyword, wholeWord) => {
        if (!keyword || (keyword.length < 3 && !wholeWord)) return text;
        const regex = wholeWord
            ? new RegExp(`(?<!<[^>]*)\\b${keyword}\\b(?![^<]*>)`, 'gi')
            : new RegExp(`(?<!<[^>]*)${keyword}(?![^<]*>)`, 'g');
        return text.replace(regex, '<span style="color: #d2691e;">$&</span>');
    };

    const renderContent = (content, isDark, applyEmphasis) => (
        <JsxParser
            bindings={{env_funcs, env_vars}}
            components={env_components}
            jsx={
                isDark
                    ? `<div style="color: white;">${applyEmphasis ? emphasizeText(content, emphasize.keyword, emphasize.wholeWord) : content}</div>`
                    : (applyEmphasis ? emphasizeText(content, emphasize.keyword, emphasize.wholeWord) : content)
            }
            renderError={error => <div style={{color: "red"}}>{error.error.toString()}</div>}
        />
    );

    const renderTabs = (tabs, isDark) => (
        <>
            <TabContext value={value}>
                <Box sx={{borderBottom: 0, borderColor: 'divider'}}>
                    <TabList onChange={handleChange}>
                        {Object.keys(tabs).map((tab, i) => (
                            <Tab style={{color: isDark ? 'white' : ''}} key={i} label={tab} value={i.toString()}/>
                        ))}
                    </TabList>
                </Box>
                {Object.keys(tabs).map((tab, i) => (
                    <TabPanel key={i} value={i.toString()} sx={{padding: "5px 10px"}}>
                        <Box sx={{overflowX: "auto", fontFamily: 'Verdana, sans-serif'}}>
                            {renderContent(tabs[tab], isDark, emphasize.enable && (tab === 'content' || tab === 'code'))}
                        </Box>
                    </TabPanel>
                ))}
            </TabContext>
        </>
    );


    return (
        <Card sx={{
            width: "100%",
            height: "100%",
            overflowY: 'auto',
            overflowX: 'hidden',
            wordBreak: "break-word",
            backgroundColor: dark ? '#3b3d3e' : '#f4f4f4'
        }}>
            <CardContent>
                {title && !leaves &&
                    <Typography variant="h5" style={{color: dark ? 'white' : 'black'}}>{title}</Typography>}
                {!leaves ? (
                    tabKeys.length > 0 && renderTabs(tab_dict, dark)
                ) : (
                    leaves.map((leaf, index) => (
                        <div
                            key={index}
                            data-ref={`content-${index}`}
                            data-index={leaf.id}
                            style={{marginBottom: '10px', position: 'relative'}}
                        >
                            <Typography variant="h6" style={{color: dark ? 'white' : 'black'}}>
                                {leaf.title}
                            </Typography>
                            {renderTabs(leaf.tabs, dark)}
                            {leaf.children.length>0 && <Button
                                class="hover-button"
                                onClick={() => onRightBtn(leaf.id)}
                                style={{
                                    float: 'right',
                                    right: '-10px', // Adjust as needed
                                }}
                            >→
                            </Button>}
                            {leaf.parent && <Button
                                class="hover-button"
                                onClick={() => onLeftBtn(leaf.id)}
                                style={{
                                    left: '-10px', // Adjust as needed
                                }}
                            >←
                            </Button>}
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
});
let lastScroll = 0;
const SelectedNodeLayer = (props) => {
    let node: Node = props.node;
    let treeData = props.treeData;
    let layouter = props.layouter;
    const [animate, setAnimate] = useState(false);
    const [leaves, setLeaves] = useState(layouter.getSiblingsLeaves(treeData, node));
    let currParents = node.parent;

    useEffect(() => {

        const handleWheel = () => {
            const targets = document.querySelectorAll('[data-ref]');
            let left = 0;
            let right = targets.length - 1;
            let closestIndex = -1;
            let minDistance = Infinity;

            // Define a helper function to get the distance of an element's rect.y from 0
            const getDistance = (target) => {
                const rect = target.getBoundingClientRect();
                return Math.abs(rect.y - window.innerHeight * 0.2);
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
                if (nodeId !== node.id) {
                    props.modifyTree({
                        type: 'setSelectedNode',
                        id: targets[closestIndex].getAttribute('data-index')
                    });
                }
            }
            lastScroll = new Date().getTime();
        };
        window.addEventListener('wheel', handleWheel);


        return () => {
            window.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const onRightButtonClick = (id) => {
        console.log("Right Button Clicked", id);
        let node = treeData.nodeDict[id];
        if (node.children.length > 0) {
            props.modifyTree({
                type: 'setSelectedNode',
                id: node.children[0]
            });
        }
    }


    const onLeftButtonClick = (id) => {
        console.log("Left Button Clicked", id);
        let node = treeData.nodeDict[id];
        if (treeData.nodeDict[node.parent]) {
            props.modifyTree({
                type: 'setSelectedNode',
                id: node.parent
            });
        }
    }

    const scrollToTarget = (id) => {
        let currTime = new Date().getTime();
        if (currTime - lastScroll < 300) return;
        const targetElement = document.querySelector(`[data-index="${id}"]`);
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            // if (((rect.y + rect.height / 2) > window.innerHeight * 0.7) || ((rect.y + rect.height / 2) < 0)) {
            console.log(rect.y + rect.height / 2, window.innerHeight * 0.7)
            targetElement.scrollIntoView({behavior: 'auto', block: 'start'});
            // }
        }
    };


    useEffect(() => {
        setLeaves(layouter.getSiblingsLeaves(treeData, node));

        setAnimate(true);

        // Make sure we scroll to target after the page was fully loaded.
        const scrollTimeoutId = setTimeout(() => {
            scrollToTarget(node.id);
        }, 30); // Delay scrollToTarget by 50ms

        const animateTimeoutId = setTimeout(() => {
            setAnimate(false);
        }, 0);

        // Clear both timeouts when the component unmounts or `node` changes
        return () => {
            clearTimeout(scrollTimeoutId);
            clearTimeout(animateTimeoutId);
        };
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
            <Grid key={0} item xs={3.5} style={{
                height: "100%",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeContentTabs leaves={null} tab_dict={node.tools[0]} env_funcs={env_funcs}
                                 env_vars={env_vars}
                                 env_components={env_components} title="" dark={props.dark}/>
            </Grid>


            <Grid key={1} item xs={5} style={{
                height: "100%",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeContentTabs onLeftBtn={onLeftButtonClick} onRightBtn={onRightButtonClick} leaves={leaves}
                                 tab_dict={node.tools[0]} env_funcs={env_funcs} env_vars={env_vars}
                                 env_components={env_components} title={node.title} ref={props.contentRef}
                                 dark={props.dark}/>

            </Grid>

            <Grid key={2} item xs={3.5} style={{
                height: "100%",
                transition: animate ? 'opacity 0.5s ease-in' : 'none',
                opacity: animate ? 0 : 1,
            }}>
                <NodeContentTabs leaves={null} tab_dict={node.tools[1]} env_funcs={env_funcs}
                                 env_vars={env_vars}
                                 env_components={env_components} title="" dark={props.dark}/>
            </Grid>
        </Grid>
    );
};

export default SelectedNodeLayer;
