import * as Y from 'yjs'
import * as bc from 'lib0/broadcastchannel'
import * as time from 'lib0/time'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as syncProtocol from 'y-protocols/sync'
import * as authProtocol from 'y-protocols/auth'
import * as awarenessProtocol from 'y-protocols/awareness'
import {ObservableV2} from 'lib0/observable'
import * as math from 'lib0/math'
import * as url from 'lib0/url'
import * as env from 'lib0/environment'

export const messageSync = 0
export const messageQueryAwareness = 3
export const messageAwareness = 1
export const messageAuth = 2

type MessageHandler = (
    encoder: encoding.Encoder,
    decoder: decoding.Decoder,
    provider: WebsocketProvider,
    emitSynced: boolean,
    messageType: number
) => void

const messageHandlers: MessageHandler[] = []

messageHandlers[messageSync] = (
    encoder,
    decoder,
    provider,
    emitSynced,
    _messageType
) => {
    encoding.writeVarUint(encoder, messageSync)
    const syncMessageType = syncProtocol.readSyncMessage(
        decoder,
        encoder,
        provider.doc,
        provider
    )
    if (
        emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2 &&
        !provider.synced
    ) {
        provider.synced = true
    }
}

messageHandlers[messageQueryAwareness] = (
    encoder,
    _decoder,
    provider,
    _emitSynced,
    _messageType
) => {
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
            provider.awareness,
            Array.from(provider.awareness.getStates().keys())
        )
    )
}

messageHandlers[messageAwareness] = (
    _encoder,
    decoder,
    provider,
    _emitSynced,
    _messageType
) => {
    awarenessProtocol.applyAwarenessUpdate(
        provider.awareness,
        decoding.readVarUint8Array(decoder),
        provider
    )
}

messageHandlers[messageAuth] = (
    _encoder,
    decoder,
    provider,
    _emitSynced,
    _messageType
) => {
    authProtocol.readAuthMessage(
        decoder,
        provider.doc,
        (_ydoc, reason) => permissionDeniedHandler(provider, reason)
    )
}

// @todo - this should depend on awareness.outdatedTime
const messageReconnectTimeout = 30000

const permissionDeniedHandler = (provider: WebsocketProvider, reason: string): void =>
    console.warn(`Permission denied to access ${provider.url}.\n${reason}`)

const readMessage = (provider: WebsocketProvider, buf: Uint8Array, emitSynced: boolean): encoding.Encoder => {
    const decoder = decoding.createDecoder(buf)
    const encoder = encoding.createEncoder()
    const messageType = decoding.readVarUint(decoder)
    const messageHandler = provider.messageHandlers[messageType]
    if (/** @type {any} */ (messageHandler)) {
        messageHandler(encoder, decoder, provider, emitSynced, messageType)
    } else {
        console.error('Unable to compute message')
    }
    return encoder
}

const closeWebsocketConnection = (provider: WebsocketProvider, ws: WebSocket, event: CloseEvent | null): void => {
    if (ws === provider.ws) {
        provider.emit('connection-close', [event, provider])
        provider.ws = null
        ws.close()
        provider.wsconnecting = false
        if (provider.wsconnected) {
            provider.wsconnected = false
            provider.synced = false
            // update awareness (all users except local left)
            awarenessProtocol.removeAwarenessStates(
                provider.awareness,
                Array.from(provider.awareness.getStates().keys()).filter((client: number) =>
                    client !== provider.doc.clientID
                ),
                provider
            )
            provider.emit('status', [{
                status: 'disconnected'
            }])
        } else {
            provider.wsUnsuccessfulReconnects++
        }
        // Start with no reconnect timeout and increase timeout by
        // using exponential backoff starting with 100ms
        setTimeout(
            setupWS,
            math.min(
                math.pow(2, provider.wsUnsuccessfulReconnects) * 100,
                provider.maxBackoffTime
            ),
            provider
        )
    }
}

const setupWS = (provider: WebsocketProvider): void => {
    if (provider.shouldConnect && provider.ws === null) {
        const websocket = new provider._WS(provider.url, provider.protocols)
        websocket.binaryType = 'arraybuffer'
        provider.ws = websocket
        provider.wsconnecting = true
        provider.wsconnected = false
        provider.synced = false

        websocket.onmessage = (event: MessageEvent) => {
            provider.wsLastMessageReceived = time.getUnixTime()
            const encoder = readMessage(provider, new Uint8Array(event.data), true)
            if (encoding.length(encoder) > 1) {
                websocket.send(encoding.toUint8Array(encoder))
            }
        }
        websocket.onerror = (event: Event) => {
            provider.emit('connection-error', [event, provider])
        }
        websocket.onclose = (event: CloseEvent) => {
            closeWebsocketConnection(provider, websocket, event)
        }
        websocket.onopen = () => {
            provider.wsLastMessageReceived = time.getUnixTime()
            provider.wsconnecting = false
            provider.wsconnected = true
            provider.wsUnsuccessfulReconnects = 0
            provider.emit('status', [{
                status: 'connected'
            }])
            // always send sync step 1 when connected
            const encoder = encoding.createEncoder()
            encoding.writeVarUint(encoder, messageSync)
            syncProtocol.writeSyncStep1(encoder, provider.doc)
            websocket.send(encoding.toUint8Array(encoder))
            // broadcast local awareness state
            if (provider.awareness.getLocalState() !== null) {
                const encoderAwarenessState = encoding.createEncoder()
                encoding.writeVarUint(encoderAwarenessState, messageAwareness)
                encoding.writeVarUint8Array(
                    encoderAwarenessState,
                    awarenessProtocol.encodeAwarenessUpdate(provider.awareness, [
                        provider.doc.clientID
                    ])
                )
                websocket.send(encoding.toUint8Array(encoderAwarenessState))
            }
        }
        provider.emit('status', [{
            status: 'connecting'
        }])
    }
}

const broadcastMessage = (provider: WebsocketProvider, buf: ArrayBuffer): void => {
    const ws = provider.ws
    if (provider.wsconnected && ws && ws.readyState === ws.OPEN) {
        ws.send(buf)
    }
    if (provider.bcconnected) {
        bc.publish(provider.bcChannel, buf, provider)
    }
}

interface WebsocketProviderOptions {
    connect?: boolean
    awareness?: awarenessProtocol.Awareness
    params?: Record<string, string>
    protocols?: string[]
    WebSocketPolyfill?: typeof WebSocket
    resyncInterval?: number
    maxBackoffTime?: number
    disableBc?: boolean
}

type WebsocketProviderEvents = {
    'connection-close': (event: CloseEvent | null, provider: WebsocketProvider) => void
    'status': (event: { status: 'connected' | 'disconnected' | 'connecting' }) => void
    'connection-error': (event: Event, provider: WebsocketProvider) => void
    'sync': (state: boolean) => void
    'synced': (state: boolean) => void
}

export class WebsocketProvider extends ObservableV2<WebsocketProviderEvents> {
    public serverUrl: string
    public bcChannel: string
    public maxBackoffTime: number
    public params: Record<string, string>
    public protocols: string[]
    public roomname: string
    public doc: Y.Doc
    public _WS: typeof WebSocket
    public awareness: awarenessProtocol.Awareness
    public wsconnected: boolean
    public wsconnecting: boolean
    public bcconnected: boolean
    public disableBc: boolean
    public wsUnsuccessfulReconnects: number
    public messageHandlers: MessageHandler[]
    private _synced: boolean
    public ws: WebSocket | null
    public wsLastMessageReceived: number
    public shouldConnect: boolean
    private _resyncInterval: number | NodeJS.Timeout
    private _bcSubscriber: (data: ArrayBuffer, origin: any) => void
    private _updateHandler: (update: Uint8Array, origin: any) => void
    private _awarenessUpdateHandler: (changed: any, origin: any) => void
    private _exitHandler: () => void
    private _checkInterval: number | NodeJS.Timeout

    constructor(
        serverUrl: string,
        roomname: string,
        doc: Y.Doc,
        {
            connect = true,
            awareness = new awarenessProtocol.Awareness(doc),
            params = {},
            protocols = [],
            WebSocketPolyfill = WebSocket,
            resyncInterval = -1,
            maxBackoffTime = 2500,
            disableBc = false
        }: WebsocketProviderOptions = {}
    ) {
        super()
        // ensure that serverUrl does not end with /
        while (serverUrl[serverUrl.length - 1] === '/') {
            serverUrl = serverUrl.slice(0, serverUrl.length - 1)
        }
        this.serverUrl = serverUrl
        this.bcChannel = serverUrl + '/' + roomname
        this.maxBackoffTime = maxBackoffTime
        this.params = params
        this.protocols = protocols
        this.roomname = roomname
        this.doc = doc
        this._WS = WebSocketPolyfill
        this.awareness = awareness
        this.wsconnected = false
        this.wsconnecting = false
        this.bcconnected = false
        this.disableBc = disableBc
        this.wsUnsuccessfulReconnects = 0
        this.messageHandlers = messageHandlers.slice()
        this._synced = false
        this.ws = null
        this.wsLastMessageReceived = 0
        this.shouldConnect = connect
        this._resyncInterval = 0
        if (resyncInterval > 0) {
            this._resyncInterval = /** @type {any} */ (setInterval(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    // resend sync step 1
                    const encoder = encoding.createEncoder()
                    encoding.writeVarUint(encoder, messageSync)
                    syncProtocol.writeSyncStep1(encoder, doc)
                    this.ws.send(encoding.toUint8Array(encoder))
                }
            }, resyncInterval))
        }

        this._bcSubscriber = (data: ArrayBuffer, origin: any) => {
            if (origin !== this) {
                const encoder = readMessage(this, new Uint8Array(data), false)
                if (encoding.length(encoder) > 1) {
                    bc.publish(this.bcChannel, encoding.toUint8Array(encoder), this)
                }
            }
        }
        this._updateHandler = (update: Uint8Array, origin: any) => {
            if (origin !== this) {
                const encoder = encoding.createEncoder()
                encoding.writeVarUint(encoder, messageSync)
                syncProtocol.writeUpdate(encoder, update)
                broadcastMessage(this, encoding.toUint8Array(encoder))
            }
        }
        this.doc.on('update', this._updateHandler)
        this._awarenessUpdateHandler = ({added, updated, removed}: any, _origin: any) => {
            const changedClients = added.concat(updated).concat(removed)
            const encoder = encoding.createEncoder()
            encoding.writeVarUint(encoder, messageAwareness)
            encoding.writeVarUint8Array(
                encoder,
                awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
            )
            broadcastMessage(this, encoding.toUint8Array(encoder))
        }
        this._exitHandler = () => {
            awarenessProtocol.removeAwarenessStates(
                this.awareness,
                [doc.clientID],
                'app closed'
            )
        }
        if (env.isNode && typeof process !== 'undefined') {
            process.on('exit', this._exitHandler)
        }
        awareness.on('update', this._awarenessUpdateHandler)
        this._checkInterval = /** @type {any} */ (setInterval(() => {
            if (
                this.wsconnected &&
                messageReconnectTimeout <
                time.getUnixTime() - this.wsLastMessageReceived
            ) {
                // no message received in a long time - not even your own awareness
                // updates (which are updated every 15 seconds)
                closeWebsocketConnection(this, /** @type {WebSocket} */ (this.ws), null)
            }
        }, messageReconnectTimeout / 10))
        if (connect) {
            this.connect()
        }
    }

    get url(): string {
        const encodedParams = url.encodeQueryParams(this.params)
        return this.serverUrl + '/' + this.roomname +
            (encodedParams.length === 0 ? '' : '?' + encodedParams)
    }

    get synced(): boolean {
        return this._synced
    }

    set synced(state: boolean) {
        if (this._synced !== state) {
            this._synced = state
            this.emit('synced', [state])
            this.emit('sync', [state])
        }
    }

    destroy(): void {
        if (this._resyncInterval !== 0) {
            clearInterval(this._resyncInterval)
        }
        clearInterval(this._checkInterval)
        this.disconnect()
        if (env.isNode && typeof process !== 'undefined') {
            process.off('exit', this._exitHandler)
        }
        this.awareness.off('update', this._awarenessUpdateHandler)
        this.doc.off('update', this._updateHandler)
        super.destroy()
    }

    connectBc(): void {
        if (this.disableBc) {
            return
        }
        if (!this.bcconnected) {
            bc.subscribe(this.bcChannel, this._bcSubscriber)
            this.bcconnected = true
        }
        // send sync step1 to bc
        // write sync step 1
        const encoderSync = encoding.createEncoder()
        encoding.writeVarUint(encoderSync, messageSync)
        syncProtocol.writeSyncStep1(encoderSync, this.doc)
        bc.publish(this.bcChannel, encoding.toUint8Array(encoderSync), this)
        // broadcast local state
        const encoderState = encoding.createEncoder()
        encoding.writeVarUint(encoderState, messageSync)
        syncProtocol.writeSyncStep2(encoderState, this.doc)
        bc.publish(this.bcChannel, encoding.toUint8Array(encoderState), this)
        // write queryAwareness
        const encoderAwarenessQuery = encoding.createEncoder()
        encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness)
        bc.publish(
            this.bcChannel,
            encoding.toUint8Array(encoderAwarenessQuery),
            this
        )
        // broadcast local awareness state
        const encoderAwarenessState = encoding.createEncoder()
        encoding.writeVarUint(encoderAwarenessState, messageAwareness)
        encoding.writeVarUint8Array(
            encoderAwarenessState,
            awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
                this.doc.clientID
            ])
        )
        bc.publish(
            this.bcChannel,
            encoding.toUint8Array(encoderAwarenessState),
            this
        )
    }

    disconnectBc(): void {
        // broadcast message with local awareness state set to null (indicating disconnect)
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, messageAwareness)
        encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
                this.doc.clientID
            ], new Map())
        )
        broadcastMessage(this, encoding.toUint8Array(encoder))
        if (this.bcconnected) {
            bc.unsubscribe(this.bcChannel, this._bcSubscriber)
            this.bcconnected = false
        }
    }

    disconnect(): void {
        this.shouldConnect = false
        this.disconnectBc()
        if (this.ws !== null) {
            closeWebsocketConnection(this, this.ws, null)
        }
    }

    connect(): void {
        this.shouldConnect = true
        if (!this.wsconnected && this.ws === null) {
            setupWS(this)
            this.connectBc()
        }
    }
}