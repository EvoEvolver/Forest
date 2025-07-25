import {createNewTree} from "../treeOps";
import * as dotenv from "dotenv"
dotenv.config();

createNewTree("AgentNodeType")
//createNewTree("AgentNodeType", "https://treer.ai", process.env.FOREST_ADMIN_TOKEN)
