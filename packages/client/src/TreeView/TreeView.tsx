import React, {useEffect, useState} from 'react';
import {Box, Typography} from '@mui/material';
import {useAtomValue, useSetAtom} from "jotai";
import {listOfNodesForViewAtom, treeAtom} from "../TreeState/TreeState";
import {isMobileModeAtom} from "../appState";
import {ColumnLeft} from "./ColumnLeft";
import {ColumnRight} from "./ColumnRight";
import {updateChildrenCountAtom} from "../TreeState/childrenCount";
import {MarkedNodesBar} from './MarkedNodesBar';
import {DragProvider} from './DragContext';
import {MiddleContents} from './components/MiddleContents';
import {Breadcrumb} from './components/Breadcrumb';


const TreeViewContent = () => {
    const leaves = useAtomValue(listOfNodesForViewAtom)
    const mobileMode = useAtomValue(isMobileModeAtom)
    const tree = useAtomValue(treeAtom)
    const commitNumber = useAtomValue(tree.viewCommitNumberAtom)
    const countChildren = useSetAtom(updateChildrenCountAtom)
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        countChildren({})
    }, [commitNumber]);

    if (leaves.length === 0)
        return null
    return (
        <>
            {/* Fixed breadcrumb at top center */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 110,
                    backgroundColor: 'background.paper',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    boxShadow: theme => theme.shadows[3],
                    border: theme => `1px solid ${theme.palette.divider}`,
                    maxWidth: !mobileMode ? '60vw' : '90vw',
                    width: 'auto',
                }}
            >
                <Breadcrumb />
            </Box>

            {/* Fixed left column */}
            {!mobileMode && (
                <div style={{
                    position: 'fixed',
                    left: 10,
                    top: 70,
                    bottom: 10,
                    width: "20vw",
                    zIndex: 100
                }}>
                    <ColumnLeft/>
                </div>
            )}

            {/* Fixed right column */}
            {!mobileMode && (
                <div style={{
                    position: 'fixed',
                    right: 20,
                    top: 70,
                    bottom: 10,
                    width: "20vw",
                    zIndex: 100
                }}>
                    <ColumnRight/>
                </div>
            )}

            {/* Main content with grey background */}
            <div style={{
                minHeight: "100vh",
                width: "100%",
                margin: "auto",
                backgroundColor: "transparent",
                paddingTop: "100px", // Increased to account for breadcrumb
                paddingBottom: "10px",
                paddingLeft: !mobileMode ? "25vw" : "10px", // 300 + 16 gap + 10 padding
                paddingRight: !mobileMode ? "25vw" : "10px", // 400 + 16 gap + 10 padding
                boxSizing: "border-box"
            }}>
                <div>
                    <div>
                        {leaves.filter((n) => n.data["archived"] !== true).map((n) => <MiddleContents node={n}
                                                                                                      key={n.id}/>)}
                    </div>
                    {/* Archive section only if there are archived nodes */}
                    {leaves.some(n => n.data["archived"] === true) && (
                        <>
                            <div style={{marginTop: 16, marginBottom: 8, display: 'flex', alignItems: 'center'}}>
                                <Typography
                                    sx={{color: '#afafaf'}}
                                    onClick={() => setShowArchived(v => !v)}
                                >
                                    Archived ({leaves.filter(n => n.data["archived"] === true).length})
                                    ({showArchived ? 'hide' : 'show'})
                                </Typography>
                            </div>
                            {showArchived && (
                                <Box style={{border: '1px dashed #555', borderRadius: 6, padding: 8, marginBottom: 8}}>
                                    {leaves.filter((n) => n.data["archived"] === true).map((n) => <MiddleContents
                                        node={n} key={n.id}/>)}
                                </Box>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            {/* Floating bottom bar for marked nodes */}
            <MarkedNodesBar />
        </>
    );
};

const TreeView = () => {
    return (
        <DragProvider>
            <TreeViewContent />
        </DragProvider>
    );
};




export default TreeView;
