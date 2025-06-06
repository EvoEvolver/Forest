import * as Y from 'yjs'
import * as syncProtocol from './sync_protocol'
import * as awarenessProtocol from 'y-protocols/awareness'

import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as map from 'lib0/map'
import {IncomingMessage} from 'http'
import {WebSocket} from 'ws'
import debounce from 'lodash.debounce'

import {callbackHandler, isCallbackSet} from './callback'
import {MongodbPersistence} from "y-mongodb-provider";

import {Redis} from "ioredis";

import * as path from 'path'
// Read dotenv variables
import * as dotenv from 'dotenv'
dotenv.config({
  path: path.resolve(__dirname, '.env'),
})


const CALLBACK_DEBOUNCE_WAIT = parseInt(process.env.CALLBACK_DEBOUNCE_WAIT || '2000')
const CALLBACK_DEBOUNCE_MAXWAIT = parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT || '10000')

const wsReadyStateConnecting = 0
const wsReadyStateOpen = 1
const wsReadyStateClosing = 2 // eslint-disable-line
const wsReadyStateClosed = 3 // eslint-disable-line

// disable gc when using snapshots!
const gcEnabled = process.env.GC !== 'false' && process.env.GC !== '0'
if (gcEnabled) {
    console.log("Garbage collection is enabled.")
}

/**
 * @type {{bindState: function(string,WSSharedDoc):void, writeState:function(string,WSSharedDoc):Promise<any>, provider: any}|null}
 */
let persistence = null


/**
 * @param {{bindState: function(string,WSSharedDoc):void,
 * writeState:function(string,WSSharedDoc):Promise<any>,provider:any}|null} persistence_
 */
export const setPersistence = persistence_ => {
    persistence = persistence_
}

/**
 * @return {null|{bindState: function(string,WSSharedDoc):void,
 * writeState:function(string,WSSharedDoc):Promise<any>}|null} used persistence layer
 */
export const getPersistence = () => persistence

//
let mongoUrl = process.env.Y_PERSISTENCE_MONGO_URL || null
if (mongoUrl) {
    console.log("Connecting to MongoDB because a Y_PERSISTENCE_MONGO_URL is set")
    const mdb = new MongodbPersistence(mongoUrl, {
        collectionName: 'transactions',
        flushSize: 100,
        multipleCollections: true,
    });

    setPersistence({
        bindState: async (docName, ydoc) => {
            // Here you listen to granular document updates and store them in the database
            // You don't have to do this, but it ensures that you don't lose content when the server crashes
            // See https://github.com/yjs/yjs#Document-Updates for documentation on how to encode
            // document updates

            // official default code from: https://github.com/yjs/y-websocket/blob/37887badc1f00326855a29fc6b9197745866c3aa/bin/utils.js#L36
            const persistedYdoc = await mdb.getYDoc(docName);
            const newUpdates = Y.encodeStateAsUpdate(ydoc);
            mdb.storeUpdate(docName, newUpdates);
            Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));
            ydoc.on('update', async (update) => {
                mdb.storeUpdate(docName, update);
            });
        },
        writeState: async (docName, ydoc) => {
            // This is called when all connections to the document are closed.
            // In the future, this method might also be called in intervals or after a certain number of updates.
            return new Promise<void>((resolve) => {
                // When the returned Promise resolves, the document will be destroyed.
                // So make sure that the document really has been written to the database.
                resolve();
            });
        },
    })

}
else{
    console.log("Not connecting to MongoDB because no Y_PERSISTENCE_MONGO_URL is set")
}

const redisUrl = process.env.Y_STREAM_REDIS_URL || null
export var redisClient: Redis | null = null
if (redisUrl) {
    console.log("Connecting to Redis because a Y_STREAM_REDIS_URL is set")
    redisClient = new Redis(redisUrl)
}
else {
    console.log("Not connecting to Redis because no Y_STREAM_REDIS_URL is set")
}



/**
 * @type {Map<string,WSSharedDoc>}
 */
export const docs = new Map()

const messageSync = 0
const messageAwareness = 1
// const messageAuth = 2


const updateHandler = (update: Uint8Array, _origin: any, doc: WSSharedDoc, _tr: any) => {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeUpdate(encoder, update)
    const message = encoding.toUint8Array(encoder)
    // broadcast update to all connections
    doc.conns.forEach((_, conn: WebSocket) => sendToClient(doc, conn, message))
}


let contentInitializor: (ydoc: Y.Doc) => Promise<void> = _ydoc => Promise.resolve()

/**
 * This function is called once every time a Yjs document is created. You can
 * use it to pull data from an external source or initialize content.
 */
export const setContentInitializor = (f: (ydoc: Y.Doc) => Promise<void>) => {
    contentInitializor = f
}

export class WSSharedDoc extends Y.Doc {
    name: string;
    /**
     * Maps from conn to set of controlled user ids. Delete all user ids from awareness when this conn is closed
     */
    conns: Map<WebSocket, Set<number>>;
    awareness: awarenessProtocol.Awareness;
    whenInitialized: Promise<void>;

    constructor(name: string) {
        super({gc: gcEnabled})
        this.name = name
        this.conns = new Map()
        /**
         * @type {awarenessProtocol.Awareness}
         */
        this.awareness = new awarenessProtocol.Awareness(this)
        this.awareness.setLocalState(null)
        /**
         * @param {{ added: Array<number>, updated: Array<number>, removed: Array<number> }} changes
         * @param {Object | null} conn Origin is the connection that made the change
         */
        const awarenessChangeHandler = ({added, updated, removed}, conn) => {
            const changedClients = added.concat(updated, removed)
            if (conn !== null) {
                const connControlledIDs = /** @type {Set<number>} */ (this.conns.get(conn))
                if (connControlledIDs !== undefined) {
                    added.forEach(clientID => {
                        connControlledIDs.add(clientID)
                    })
                    removed.forEach(clientID => {
                        connControlledIDs.delete(clientID)
                    })
                }
            }
            // broadcast awareness update
            const encoder = encoding.createEncoder()
            encoding.writeVarUint(encoder, messageAwareness)
            encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients))
            const buff = encoding.toUint8Array(encoder)
            this.conns.forEach((_, c: WebSocket) => {
                sendToClient(this, c, buff)
            })
            /*if (redisClient) {
                // also send awareness update to redis stream
                const encoded = Buffer.from(buff).toString('base64');
                redisClient.xadd(`y-websocket:awareness:${this.name}`, '*', "data", encoded).catch(err => {
                    console.error("Error sending awareness update to Redis stream:", err)
                })
            }*/
        }
        this.awareness.on('update', awarenessChangeHandler)
        this.on('update', /** @type {any} */ (updateHandler))
        if (isCallbackSet) {
            this.on('update', /** @type {any} */ (debounce(
                callbackHandler,
                CALLBACK_DEBOUNCE_WAIT,
                {maxWait: CALLBACK_DEBOUNCE_MAXWAIT}
            )))
        }
        this.whenInitialized = contentInitializor(this)
    }
}


/**
 * Gets a Y.Doc by name, whether in memory or on disk
 */
export const getYDoc = (docname: string, gc: boolean = true): WSSharedDoc => map.setIfUndefined(docs, docname, () => {
    const doc = new WSSharedDoc(docname)
    doc.gc = gc
    if (persistence !== null) {
        persistence.bindState(docname, doc)
    }
    docs.set(docname, doc)
    return doc
})


const messageListener = (conn: WebSocket, doc: WSSharedDoc, message: Uint8Array) => {
    try {
        // encoder is the message that will be sent back to the client
        const encoder = encoding.createEncoder()
        // decoder is the message received from the client
        const decoder = decoding.createDecoder(message)
        const messageType = decoding.readVarUint(decoder)
        switch (messageType) {
            case messageSync:
                encoding.writeVarUint(encoder, messageSync)
                syncProtocol.readSyncMessage(decoder, encoder, doc, conn)

                // If the `encoder` only contains the type of reply message and no
                // message, there is no need to send the message. When `encoder` only
                // contains the type of reply, its length is 1.
                if (encoding.length(encoder) > 1) {
                    sendToClient(doc, conn, encoding.toUint8Array(encoder))
                }
                break
            case messageAwareness: {
                awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn)
                break
            }
        }
    } catch (err) {
        console.error(err)
        // @ts-ignore
        doc.emit('error', [err])
    }
}


const closeConn = (doc: WSSharedDoc, conn: WebSocket) => {
    if (doc.conns.has(conn)) {
        /**
         * @type {Set<number>}
         */
            // @ts-ignore
        const controlledIds = doc.conns.get(conn)
        doc.conns.delete(conn)
        awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null)
        if (doc.conns.size === 0 && persistence !== null) {
            // if persisted, we store state and destroy ydocument
            persistence.writeState(doc.name, doc).then(() => {
                doc.destroy()
            })
            console.log("Deleting doc because no connections left:", doc.name)
            docs.delete(doc.name)
        }
    }
    conn.close()
}

/*
 * Sends a message to the client, closes the connection if it fails
 */
const sendToClient = (doc: WSSharedDoc, conn: WebSocket, m: Uint8Array) => {
    if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
        closeConn(doc, conn)
    }
    try {
        conn.send(m, {}, err => {
            err != null && closeConn(doc, conn)
        })
    } catch (e) {
        closeConn(doc, conn)
    }
}

const pingTimeout = 30000


export const setupWSConnection = (conn: WebSocket, req: IncomingMessage, options) => {
    const {doc, gc}=options
    conn.binaryType = 'arraybuffer'
    // get doc, initialize if it does not exist yet
    doc.conns.set(conn, new Set())
    // listen and reply to events
    conn.on('message', (message: ArrayBuffer) => messageListener(conn, doc, new Uint8Array(message)))

    // Check if the connection is still alive
    let pongReceived = true
    const pingInterval = setInterval(() => {
        if (!pongReceived) {
            if (doc.conns.has(conn)) {
                closeConn(doc, conn)
            }
            clearInterval(pingInterval)
        } else if (doc.conns.has(conn)) {
            pongReceived = false
            try {
                conn.ping()
            } catch (e) {
                closeConn(doc, conn)
                clearInterval(pingInterval)
            }
        }
    }, pingTimeout)
    conn.on('close', () => {
        closeConn(doc, conn)
        clearInterval(pingInterval)
    })
    conn.on('pong', () => {
        pongReceived = true
    })
    // put the following variables in a block so the interval handlers don't keep in in
    // scope
    {
        // send sync step 1
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, messageSync)
        syncProtocol.writeSyncStep1(encoder, doc)
        sendToClient(doc, conn, encoding.toUint8Array(encoder))
        const awarenessStates = doc.awareness.getStates()
        if (awarenessStates.size > 0) {
            const encoder = encoding.createEncoder()
            encoding.writeVarUint(encoder, messageAwareness)
            encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())))
            sendToClient(doc, conn, encoding.toUint8Array(encoder))
        }
        // todo: the doc can be destroyed here after the sync step 1 message has been sent

    }
}