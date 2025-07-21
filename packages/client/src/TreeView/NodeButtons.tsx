import {useAtomValue, useSetAtom} from "jotai";
import {
    scrollToNodeAtom,
    setToNodeChildrenAtom,
    setToNodeParentAtom
} from "../TreeState/TreeState";
import {useTheme} from "@mui/system";
import {Button} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import React from "react";
import {NodeVM} from "@forest/schema";

export const NodeButtons = (props: { node: NodeVM }) => {

    const setToNodeChildren = useSetAtom(setToNodeChildrenAtom)
    const setToNodeParent = useSetAtom(setToNodeParentAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    const nodeChildren = useAtomValue(props.node.children)
    const theme = useTheme()
    const node = props.node;

    const onLeftBtn = () => {
        setToNodeParent(node.id)
        if (scrollToNode) {
            setTimeout(() => {
                scrollToNode(node.parent)
            }, 100)
        }
    }
    const onRightBtn = () => {
        setToNodeChildren(node.id)
    }

    return <div
        style={{
            height: '2rem',
            paddingLeft: '10px',
            paddingRight: '10px',
            position: 'relative'
        }}
    >
        {node.parent && <Button
            size="small"
            variant="contained"
            onClick={() => onLeftBtn()}
            style={{
                //align left
                position: 'absolute',
                left: '0',
                width: "40%",
                backgroundColor: theme.palette.primary.light
            }}
        ><ArrowBackIcon></ArrowBackIcon>
        </Button>}
        {nodeChildren.length > 0 && <Button
            size="small"
            variant="contained"
            onClick={() => onRightBtn()}
            style={{
                // align right
                position: 'absolute',
                right: '0',
                width: "40%",
                backgroundColor: theme.palette.primary.light
            }}
        ><ArrowForwardIcon></ArrowForwardIcon> <span>({node.data['children_count']} more)</span>
        </Button>}
    </div>
}