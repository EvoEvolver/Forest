import {WebsocketProvider} from 'y-websocket'
import * as Y from 'yjs'

function main(host1, host2, treeId){
    let ydoc1 = new Y.Doc()
    let ydoc2 = new Y.Doc()
    let wsProvider1 = new WebsocketProvider(`${host1}/`, treeId, ydoc1)
    const newTreeId = crypto.randomUUID()
    let wsProvider2

    wsProvider1.on('status', event => {
        console.log("host1", event)
    })
    ydoc2.on('update', event => {
        console.log('updated ydoc2 with state from ydoc1')
    })

    wsProvider1.on('sync', isSynced => {
        if (isSynced) {
            console.log('Syncing completed to host1')
            // Export state from ydoc1 and apply it to ydoc2
            Y.applyUpdate(ydoc2, Y.encodeStateAsUpdate(ydoc1))
            wsProvider1.disconnect()

            wsProvider2 = new WebsocketProvider(host2, newTreeId, ydoc2)
            wsProvider2.on('status', event => {
                console.log("host2", event)
            })
            wsProvider2.on('sync', isSynced => {
                console.log('Syncing completed to host2')
                let httpHost2 = host2.replace("ws", "http")
                console.log(`See tree at ${httpHost2}/?id=${newTreeId}`)
                wsProvider2.disconnect()
            })

        }
    })
}

const host1 = 'wss://treer.ai'
const host2 = 'ws://0.0.0.0:29999'
main(host1, host2, '291542531202716545479662584430023525144')