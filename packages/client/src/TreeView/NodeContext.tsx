import {Context, createContext} from "react";
import {NodeVM} from "@forest/schema";

export const thisNodeContext: Context<NodeVM> = createContext(null)