import {Box} from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import {Code, FigureBox, HTMLContent, NodeNavigator, TeX, TextSpan} from "./inline";

export const componentsForCustomNode = {
    Code,
    TeX,
    NodeNavigator,
    FigureBox,
    TextSpan,
    Tooltip,
    Box,
    HTMLContent
}

export * from './CustomNodeType'