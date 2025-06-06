import http from 'http'
import { parseInt } from 'lib0/number'
import {WSSharedDoc} from "./utils";

const CALLBACK_URL = process.env.CALLBACK_URL ? new URL(process.env.CALLBACK_URL) : null
const CALLBACK_TIMEOUT = parseInt(process.env.CALLBACK_TIMEOUT || '5000')
const CALLBACK_OBJECTS = process.env.CALLBACK_OBJECTS ? JSON.parse(process.env.CALLBACK_OBJECTS) : {}

export const isCallbackSet = !!CALLBACK_URL


export const callbackHandler = (update: Uint8Array, origin: any, doc: WSSharedDoc) => {
  const room = doc.name
  const dataToSend = {
    room,
    data: {}
  }
  const sharedObjectList = Object.keys(CALLBACK_OBJECTS)
  sharedObjectList.forEach(sharedObjectName => {
    const sharedObjectType = CALLBACK_OBJECTS[sharedObjectName]
    dataToSend.data[sharedObjectName] = {
      type: sharedObjectType,
      content: getContent(sharedObjectName, sharedObjectType, doc).toJSON()
    }
  })
  CALLBACK_URL && callbackRequest(CALLBACK_URL, CALLBACK_TIMEOUT, dataToSend)
}


const callbackRequest = (url: URL, timeout: number, data: object) => {
  const dataStr = JSON.stringify(data)
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    timeout,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataStr)
    }
  }
  const req = http.request(options)
  req.on('timeout', () => {
    console.warn('Callback request timed out.')
    req.abort()
  })
  req.on('error', (e) => {
    console.error('Callback request error.', e)
    req.abort()
  })
  req.write(dataStr)
  req.end()
}


const getContent = (objName: string, objType: string, doc: WSSharedDoc) => {
  switch (objType) {
    case 'Array': return doc.getArray(objName)
    case 'Map': return doc.getMap(objName)
    case 'Text': return doc.getText(objName)
    case 'XmlFragment': return doc.getXmlFragment(objName)
    case 'XmlElement': return doc.getXmlElement(objName)
    default : throw new Error(`Unknown object type: ${objType} for object: ${objName}`)
  }
}