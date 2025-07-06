
import {duplicateTree} from "../treeOps";
import * as process from "node:process";
import * as dotenv from "dotenv"
import * as readline from 'readline';
dotenv.config();

const FOREST_ADMIN_TOKEN=process.env.FOREST_ADMIN_TOKEN;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter source ID: ', (sourceId) => {
    duplicateTree(sourceId, "https://treer.ai", "http://localhost:29999", FOREST_ADMIN_TOKEN)
        .then(console.log)
        .catch(console.error)
        .finally(() => {
            rl.close();
        });
});