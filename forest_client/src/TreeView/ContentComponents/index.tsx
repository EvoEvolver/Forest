import {Box} from "@mui/material";
import {atom} from "jotai/index";
import Tooltip from "@mui/material/Tooltip";
import ProseMirrorEditor from "./editor";
import {AddChildrenButton} from "./treeOperations";
import ChatView from "./chat";
import {Code, Expandable, FigureBox, NodeNavigator, TeX, TextSpan} from "./inline";
import {PaperEditorMain, PaperEditorSide1, PaperEditorSide2} from "./integrated/paperEditor";


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
    addChildrenButton: AddChildrenButton,
    ChatView,
    PaperEditorMain,
    PaperEditorSide1,
    PaperEditorSide2
})