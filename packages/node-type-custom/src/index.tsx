import {Box} from "@mui/material";
import {atom} from "jotai";
import Tooltip from "@mui/material/Tooltip";
import TiptapEditor from "./editor";
import ChatView from "./chat";
import {Code, Expandable, FigureBox, HTMLContent, NodeNavigator, TeX, TextSpan} from "./inline";
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
    TiptapEditor,
    ChatView,
    PaperEditorMain,
    PaperEditorSide1,
    PaperEditorSide2,
    HTMLContent
})