import {Box} from "@mui/material";
import {atom} from "jotai/index";
import Tooltip from "@mui/material/Tooltip";
import ProseMirrorEditor from "./editor";
import {addChildrenButton} from "./treeOperations";
import ChatView from "./chat";
import {Code, Expandable, FigureBox, NodeNavigator, TeX, TextSpan} from "./inline";


export const envComponentAtom = atom({
    Code,
    TeX,
    NodeNavigator,
    FigureBox,
    Expandable,
    TextSpan,
    Tooltip,
    Box,
    ProseMirrorEditor,
    addChildrenButton,
    ChatView
})