import {WebsocketProvider} from 'y-websocket'
import * as Y from 'yjs'

function main(host1, host2, treeId){
    let ydoc1 = new Y.Doc()
    let ydoc2 = new Y.Doc()
    let wsProvider1 = new WebsocketProvider(`wss://${host1}/`, treeId, ydoc1)
    const newTreeId = "1234567"
    let wsProvider2

    wsProvider1.on('status', event => {
        console.log(event)
    })
    ydoc2.on('update', event => {
        console.log('updated ydoc2 with state from ydoc1')
    })

    wsProvider1.on('synced', isSynced => {
        if (isSynced) {
            console.log('Syncing completed to host1')
            // Export state from ydoc1 and apply it to ydoc2
            Y.applyUpdate(ydoc2, Y.encodeStateAsUpdate(ydoc1))
            wsProvider1.disconnect()

            wsProvider2 = new WebsocketProvider(`ws://127.0.0.1:29999`, newTreeId, ydoc2)
            wsProvider2.on('status', event => {
                console.log("Connected to host2")
            })
            wsProvider2.on('synced', isSynced => {
                console.log('Syncing completed to host2')
                console.log(`See tree at http://0.0.0.0:39999/?id=${newTreeId}`)
            })

        }
    })
}

host1 = 'treer.ai'
host2 = '0.0.0.0:29999'
main(host1, host2, '291542531202716545479662584430023525144')