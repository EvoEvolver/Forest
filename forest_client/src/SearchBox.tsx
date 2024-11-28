import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react";
import {useAtom} from "jotai/index";
import {selectedNodeAtom} from "./Layouter";
import sanitizeHtml from "sanitize-html";
import {
    Box,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    TextField,
    ToggleButton,
    Typography
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";

export const CentralSearchBox = forwardRef(({onSearch, props, modifyTree, contentRef}, ref) => {

    const textFieldRef = useRef(null);
    let [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)

    useEffect(() => {
        if (textFieldRef.current) {
            textFieldRef.current.focus(); // Focus the TextField when the component mounts
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

        function isLetter(char) {
            if (char.length !== 1) {
                return false;
            }
            const code = char.charCodeAt(0);
            return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
        }

        Object.entries(props.tree['nodeDict']).forEach(([key, value]) => {
            if ('tabs' in value && 'content' in value['tabs']) {
                const plainText = sanitizeHtml(String(value['tabs']['content']), {
                    allowedTags: [],
                    allowedAttributes: {}
                });
                let index = plainText.toLowerCase().indexOf(searchTerm.toLowerCase());
                console.log(index);
                if (w && index !== -1) {
                    if (((index - 1) > 0 && isLetter(plainText[index - 1])) || ((index + searchTerm.length < plainText.length) && isLetter(plainText[index + searchTerm.length]))) {
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
        setSelectedNode(key)
    };
    const handleArrowUp = () => {
        setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
        setSelectedNode(searchResults[currentIndex > 0 ? currentIndex - 1 : 0].key)
    };

    const handleArrowDown = () => {
        setCurrentIndex((prevIndex) => (prevIndex < searchResults.length - 1 ? prevIndex + 1 : searchResults.length - 1));
        setSelectedNode(searchResults[currentIndex < searchResults.length - 1 ? currentIndex + 1 : currentIndex].key)
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
                            <SearchIcon style={{color: props.dark ? 'white' : ''}}/>
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
                        color: props.dark ? 'white' : '#000000',
                    },
                }}
            />
            <Box sx={{display: 'flex', alignItems: 'center', ml: 1}}>
                <Box sx={{color: '#000000', mr: 1}} style={{width: '3vw', color: props.dark ? 'white' : ''}}>
                    {`${searchResults.length > 0 ? (currentIndex + 1) : 0}/${searchResults.length}`}
                </Box>
                <ToggleButton
                    value="wholeWord"
                    selected={wholeWord}

                    onChange={toggleWholeWord}
                    sx={{
                        width: '1vw',
                        height: '1vw',
                        p: 0.5
                    }}
                >
                    <Typography
                        style={{color: props.dark ? (wholeWord ? '#3874cb' : 'white') : (wholeWord ? '#3874cb' : 'black')}}>W</Typography>
                </ToggleButton>
                <IconButton style={{width: '1.5vw', color: props.dark ? 'white' : ''}} size="small"
                            onClick={handleArrowUp}>
                    <ArrowUpwardIcon/>
                </IconButton>
                <IconButton style={{width: '1.5vw', color: props.dark ? 'white' : ''}} size="small"
                            onClick={handleArrowDown}>
                    <ArrowDownwardIcon/>
                </IconButton>
                <IconButton style={{width: '1.5vw', color: props.dark ? 'white' : ''}} size="small"
                            onClick={handleClose}>
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