import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {Box, TextField, InputAdornment, List, ListItem, ListItemText} from '@mui/material';
import FocusPage from './FocusPage';
import Layouter from "./Layouter";
import {TreeData} from './entities';
import Treemap from './TreeMap';
import SearchIcon from '@mui/icons-material/Search';
import sanitizeHtml from 'sanitize-html';
import {border} from "@mui/system";
// convert the tree from backend to the compatible format for Forest.


const CentralSearchBox = ({props, modifyTree}) => {
    const textFieldRef = useRef(null);

    useEffect(() => {
        if (textFieldRef.current) {
            textFieldRef.current.focus(); // Focus the TextField when the component mounts
            setSearchTerm('')
        }
    }, []);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            let results = [];
            console.log(searchTerm)
            Object.entries(props.tree['nodeDict']).forEach(([key, value]) => {
                if ('tabs' in value && 'content' in value['tabs']) {
                    const plainText = sanitizeHtml(String(value['tabs']['content']), {
                        allowedTags: [],
                        allowedAttributes: {}
                    });
                    let index = plainText.toLowerCase().indexOf(searchTerm.toLowerCase());
                    if (index !== -1) { // when found the search term

                        const result = {
                            keyword: searchTerm,
                            key: key,
                            content: '...' + plainText.substring(index - 50 < 0 ? 0 : index - 50, index + 50 >= plainText.length ? plainText.length : index + 50) + '...'
                        };

                        results.push(result);
                    }

                }
            });
            setSearchResults(results);
            console.log(results)
            setSearchTerm('');
        }
    };

    const handleClick = (key) => {
        console.log(key);
        modifyTree({
            type: 'setSelectedNode',
            id: key
        });
    };

    const emphasizeText = (text, keyword) => {
        if (!keyword) return text;
        const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === keyword.toLowerCase() ? <span key={i} style={{color: 'red'}}>{part}</span> : part
        );
    };


    return (
        <Box
            sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                width: '80%',
                maxWidth: 600,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#2b2b2b',
                borderRadius: 1,
                boxShadow: 3,
                p: 2,
            }}
        >
            <TextField
                value={searchTerm}
                inputRef={textFieldRef} // Attach the ref to the TextField
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}  // 添加按键监听器
                fullWidth
                variant="outlined"
                placeholder="Search..."
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon style={{color: '#aaa'}}/>
                        </InputAdornment>
                    ),
                    style: {color: '#fff'}
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                            borderColor: '#555',
                        },
                        '&:hover fieldset': {
                            borderColor: '#777',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#999',
                        },
                        backgroundColor: '#2b2b2b',
                    },
                    input: {
                        color: '#fff',
                    },
                }}
            />
            {searchResults.length > 0 && (
                <List
                    sx={{
                        width: '100%',
                        maxWidth: 600,
                        bgcolor: 'background.paper',
                        position: 'absolute',
                        top: '80%',
                        left: '50%',
                        maxHeight: 300,
                        overflowY: 'auto',
                        transform: 'translateX(-50%)',
                        borderRadius: 1,
                        boxShadow: 3,
                    }}
                >
                    {searchResults.map((result, index) => (
                        <ListItem style={{border: '0.1px solid gray'}} button key={index}
                                  onClick={() => handleClick(result.key)}>
                            <ListItemText primary={result.key}
                                          secondary={<span>{emphasizeText(result.content, result.keyword)}</span>}/>
                        </ListItem>
                    ))}
                </List>
            )}
        </Box>
    );
};

export default function ATree(props) {

    let treeData = props.tree as TreeData;

    const selectedNodeHistoryMaxNumber = 10;
    const selectedNodeHistory = useRef([]);
    const selectedNodeRef = useRef(undefined); //TODO: use treeRef instead of selectedNodeRef?
    const backRef = useRef(false);
    let hidden = props.hidden;
    let layouter = new Layouter();


    const initialTree = {
        "selectedNode": undefined,
        "nodeDict": {}
    } as TreeData;

    let page = props.page;
    const [searchPanel, switchSearchPanel] = useState(false);


    // let [tree, setTree] = useState(initialTree);
    function reducers(tree: TreeData, action) {
        if (action.id !== undefined) {
            // user provides an id. so we need to get the node by id.
            let node = Object.values(tree.nodeDict).find((node) => node.id === action.id);
            if (node) {
                action.node = node;
            }
        }
        switch (action.type) {
            case 'updateTree':
                return layouter.updateTree(tree, action.newTree);
            case 'setSelectedNode':
                return layouter.setSelectedNode(tree, action.id);
            default:
                return tree;
        }
    }

    let showSearchPanel = false;

    const [tree, modifyTree] = useReducer(reducers, initialTree);

    const treeRef = useRef(tree);

    // On Tree Change
    useEffect(() => {
        if (treeData) {
            modifyTree({
                type: 'updateTree',
                newTree: treeData
            });
        }
    }, [treeData]);

    const keyPress = useCallback(
        (e) => {
            if (e.shiftKey && e.ctrlKey && e.key === 'F') {
                switchSearchPanel(!showSearchPanel);
                showSearchPanel = !showSearchPanel;
                return;
            }
            if (!e.shiftKey)
                return;
            let result = undefined;
            const oneToNineRegex = /^[1-9]$/;
            const key = e.key;
            if (key === 'ArrowUp') {
                result = layouter.move(treeRef.current, "left_sib");
            } else if (key === 'ArrowDown') {
                result = layouter.move(treeRef.current, "right_sib");
            } else if (key === 'ArrowLeft') {
                result = layouter.move(treeRef.current, "parent");
            } else if (key === 'ArrowRight') {
                result = layouter.move(treeRef.current, "child");
            } else if (key === 'R') {
                // result = layouter.moveToRoot(treeRef.current);
            } else if (key === 'N') {
                //result = layouter.moveToNextAvailable(treeRef.current);
            } else if (key === 'B') {
                // result = selectedNodeHistory.current.pop();
                // if (result) backRef.current = true;
            } else if (key === 'T') {
                props.setPage(page === 0 ? 1 : 0);
                props.setCurrPage(page === 0 ? 1 : 0)
                page = page === 0 ? 1 : 0
            }
            // if it's a number from 1 to 9.TT
            else if (oneToNineRegex.test(key)) {
                //result = layouter.moveToChildByIndex(treeRef.current, parseInt(key) - 1);
            }

            if (result) {
                modifyTree({
                    type: 'setSelectedNode',
                    id: result.id
                });
            }
        },
        [props.page]
    );


    useEffect(() => {
        if (layouter === undefined || !layouter.hasTree(tree)) return;

        let selectedNode = layouter.getSelectedNode(tree);
        // put the selectedNode to the history.
        if (selectedNodeRef.current && selectedNodeRef.current != null && selectedNodeRef.current != selectedNode && !backRef.current) {
            selectedNodeHistory.current.push(selectedNodeRef.current);
            if (selectedNodeHistory.current.length > selectedNodeHistoryMaxNumber) {
                selectedNodeHistory.current.shift();
            }
        }
        backRef.current = false;
        selectedNodeRef.current = selectedNode;
        if (selectedNode === null) {
            return;
        }
    }, [layouter, tree]); // Adding layouter to the dependency array

    // useEffect(() => {
    //     document.removeEventListener("keydown", keyPress);
    //     if (!hidden) {
    //         document.addEventListener("keydown", keyPress);
    //     }
    //
    //     return () => {
    //         document.removeEventListener("keydown", keyPress);
    //     };
    // }, [hidden, keyPress]);

    useEffect(() => {
        document.addEventListener("keydown", keyPress);


        return () => {
            document.removeEventListener("keydown", keyPress);
        };
    }, []);

    useEffect(() => {
        treeRef.current = tree;
    }, [tree]);

    return (
        <>
            <Box hidden={hidden} style={{width: '100vw', height: '100vh'}}>
                {searchPanel && <CentralSearchBox props={props} modifyTree={modifyTree}/>}
                {/*make two buttons to change between focus page and treemap. the buttons should be fixed to top left.*/}
                {layouter.hasTree(treeRef.current) && page === 0 &&
                    <FocusPage layouter={layouter} tree={tree} modifyTree={modifyTree}
                               send_message_to_main={props.send_message_to_main}/>}
                {layouter.hasTree(treeRef.current) && page === 1 &&
                    <Treemap layouter={layouter} tree={tree} modifyTree={modifyTree}/>}
            </Box>
        </>
    );
}