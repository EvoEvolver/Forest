import React, {useCallback, useEffect, useReducer, useRef, useState, useImperativeHandle, forwardRef} from 'react';
import {
    Box,
    TextField,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    IconButton,
    ToggleButton,
    Typography
} from '@mui/material';
import FocusPage from './FocusPage';
import Layouter from "./Layouter";
import {TreeData} from './entities';
import Treemap from './TreeMap';
import SearchIcon from '@mui/icons-material/Search';
import sanitizeHtml from 'sanitize-html';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CloseIcon from '@mui/icons-material/Close';
import {border} from "@mui/system";
// convert the tree from backend to the compatible format for Forest.


const CentralSearchBox = forwardRef(({onSearch, props, modifyTree, contentRef}, ref) => {

    const textFieldRef = useRef(null);


    useEffect(() => {
        if (textFieldRef.current) {
            textFieldRef.current.focus(); // Focus the TextField when th!e component mounts
            // 定时1秒（1000毫秒）后执行
            setTimeout(() => {
                setSearchTerm('');
            }, 50);


        }
    }, [onSearch]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [wholeWord, setWholeWord] = useState(true);

    const search = (w) => {
        if (searchTerm.length === 0) return;
        setCurrentIndex(0)
        let results = [];
        Object.entries(props.tree['nodeDict']).forEach(([key, value]) => {
            if ('tabs' in value && 'content' in value['tabs']) {
                const plainText = sanitizeHtml(String(value['tabs']['content']), {
                    allowedTags: [],
                    allowedAttributes: {}
                });
                let index = plainText.toLowerCase().indexOf(searchTerm.toLowerCase());
                if (w) {
                    if ((index - 1 > 0 && plainText[index - 1] !== ' ') || (index + searchTerm.length < plainText.length && plainText[index + searchTerm.length] !== ' ')) {
                        index = -1
                    }
                }
                if (index !== -1) { // when found the search term
                    const result = {
                        keyword: searchTerm,
                        key: key,
                        content: '...' + plainText.substring(index - 30 < 0 ? 0 : index - 30, index + 30 >= plainText.length ? plainText.length : index + 30) + '...'
                    };

                    results.push(result);
                }

            }
        });

        if (results.length === 0) {
            setSearchTerm('');
            contentRef.current.setEmphasize({'enable': false, 'keyword': searchTerm, 'wholeWord': w})
        } else {
            contentRef.current.setEmphasize({'enable': true, 'keyword': searchTerm, 'wholeWord': w})
        }
        setSearchResults(results);
    }
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            search(wholeWord);
        }
    };

    const handleClick = (key, index) => {
        console.log(key);
        setCurrentIndex(index);
        modifyTree({
            type: 'setSelectedNode',
            id: key
        });
    };
    const handleArrowUp = () => {
        setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
        modifyTree({
            type: 'setSelectedNode',
            id: searchResults[currentIndex > 0 ? currentIndex - 1 : 0].key
        });
    };

    const handleArrowDown = () => {
        setCurrentIndex((prevIndex) => (prevIndex < searchResults.length - 1 ? prevIndex + 1 : searchResults.length - 1));
        modifyTree({
            type: 'setSelectedNode',
            id: searchResults[currentIndex < searchResults.length - 1 ? currentIndex + 1 : currentIndex].key
        });
    };
    const localRef = useRef();
    useImperativeHandle(ref, () => ({
        focus: () => {
            localRef.current.focus();
        },
        clear: () => {
            handleClose();
        },
        up: () => {
            handleArrowUp();
        },
        down: () => {
            handleArrowDown();
        }
    }));

    const emphasizeText = (text, keyword) => {
        if (!keyword) return text;
        const parts = wholeWord ? text.split(new RegExp(`(\\b${keyword}\\b)`, 'gi')) : text.split(new RegExp(`(${keyword})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === keyword.toLowerCase() ? <span key={i} style={{color: 'red'}}>{part}</span> : part
        );
    };

    const handleClose = () => {
        setSearchTerm('');
        setSearchResults([]);
        setCurrentIndex(0);
        contentRef.current.setEmphasize({'enable': false, 'keyword': searchTerm, 'wholeWord': wholeWord})
    };
    const toggleWholeWord = () => {
        setWholeWord(!wholeWord);
        search(!wholeWord)
    };
    useEffect(() => {
        if (searchResults.length > 0 && listRef.current && currentIndex >= 0) {
            const list = listRef.current;
            const activeItem = list.children[currentIndex];
            const offsetHeight = list.clientHeight / 2 - activeItem.clientHeight / 2;
            list.scrollTop = activeItem.offsetTop - offsetHeight;
        }
    }, [currentIndex, searchResults]);

    const listRef = useRef(null);
    return (
        <Box
            sx={{
                position: 'absolute',
                top: '0vh',
                right: '-10vw',
                transform: 'translate(-53%, 0%)',
                zIndex: 9999,
                width: '20vw',
                height: '4.5vh',
                display: 'flex',
                boxSizing: "border-box",
                alignItems: 'center',
                backgroundColor: '#2b2b2b10',
            }}
        >
            <TextField
                value={searchTerm}
                inputRef={textFieldRef} // Attach the ref to the TextField
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                fullWidth
                style={{width: '11.5vw'}}
                variant="outlined"
                placeholder="Search..."
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon/>
                        </InputAdornment>
                    ),
                    style: {color: '#fff'}
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                            borderColor: '#00000000',
                        },
                        '&:hover fieldset': {
                            borderColor: '#00000000',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#00000000',
                        },
                        backgroundColor: '#f4f4f400',
                    },
                    input: {
                        color: '#000000',
                    },
                }}
            />
            <Box sx={{display: 'flex', alignItems: 'center', ml: 1}}>
                <Box sx={{color: '#000000', mr: 1}} style={{width: '3vw'}}>
                    {`${searchResults.length > 0 ? (currentIndex + 1) : 0}/${searchResults.length}`}
                </Box>
                <ToggleButton
                    value="wholeWord"
                    selected={wholeWord}

                    onChange={toggleWholeWord}
                    sx={{
                        color: wholeWord ? '#fff' : '#999',
                        backgroundColor: wholeWord ? '#1976d2' : 'transparent',
                        width: '1vw',
                        height: '1vw',
                        p: 0.5
                    }}
                >
                    <Typography>W</Typography>
                </ToggleButton>
                <IconButton style={{width: '1.5vw'}} size="small" onClick={handleArrowUp}>
                    <ArrowUpwardIcon/>
                </IconButton>
                <IconButton style={{width: '1.5vw'}} size="small" onClick={handleArrowDown}>
                    <ArrowDownwardIcon/>
                </IconButton>
                <IconButton style={{width: '1.5vw'}} size="small" onClick={handleClose}>
                    <CloseIcon/>
                </IconButton>
            </Box>
            {searchResults.length > 0 && (
                <List
                    sx={{
                        width: '20vw',
                        bgcolor: '#ffffff80',
                        position: 'absolute',
                        top: '4.5vh',
                        maxHeight: "20vh",
                        right: '-10vw',
                        overflowY: 'auto',
                        transform: 'translate(-50%, 0%)',
                        borderRadius: 1,
                        boxShadow: 0,
                    }}
                    ref={listRef}
                >
                    {searchResults.map((result, index) => (
                        <ListItem button key={index}
                                  onClick={() => handleClick(result.key, index)}
                                  sx={{
                                      backgroundColor: currentIndex === index ? '#e0e0e0' : 'transparent',
                                  }}>
                            <ListItemText primary={""}
                                          secondary={<span>{emphasizeText(result.content, result.keyword)}</span>}/>
                        </ListItem>
                    ))}
                </List>
            )}
        </Box>
    );

});

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
    const innerRef = useRef();

    const contentRef = useRef();

    const keyPress = useCallback(
        (e) => {
            if (!e.shiftKey) {
                if (e.key === 'Escape') {
                    console.log("esc");
                    // innerRef.current.focus();
                    innerRef.current.clear();
                } else if (e.key === 'ArrowUp') {
                    innerRef.current.up();
                } else if (e.key === 'ArrowDown') {
                    innerRef.current.down();
                }
                return;
            }

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
                result = layouter.moveToRoot(treeRef.current);
            } else if (key === 'N') {
                result = layouter.moveToNextAvailable(treeRef.current);
            } else if (key === 'B') {
                result = selectedNodeHistory.current.pop();
                if (result) backRef.current = true;
            } else if (key === 'T') {
                props.setPage(page === 0 ? 1 : 0);
                props.setCurrPage(page === 0 ? 1 : 0)
                page = page === 0 ? 1 : 0
            } else if (key === 'F') {
                switchSearchPanel(!showSearchPanel);
                showSearchPanel = !showSearchPanel;
            }
            // if it's a number from 1 to 9.TT
            else if (oneToNineRegex.test(key)) {
                result = layouter.moveToChildByIndex(treeRef.current, parseInt(key) - 1);
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
            <Box hidden={hidden} style={{width: "100vw", height: "95vh", flexGrow: 1, boxSizing: "border-box"}}>
                {<CentralSearchBox onSearch={searchPanel} props={props} modifyTree={modifyTree} contentRef={contentRef}
                                   ref={innerRef}/>}
                {/*make two buttons to change between focus page and treemap. the buttons should be fixed to top left.*/}
                {layouter.hasTree(treeRef.current) && page === 0 &&
                    <FocusPage layouter={layouter} tree={tree} modifyTree={modifyTree}
                               send_message_to_main={props.send_message_to_main} contentRef={contentRef}/>}
                {layouter.hasTree(treeRef.current) && page === 1 &&
                    <Treemap layouter={layouter} tree={tree} modifyTree={modifyTree}/>}
            </Box>
        </>
    );
}