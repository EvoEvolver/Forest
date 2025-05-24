import React, {useEffect, useState} from 'react'
import {Array as YArray} from 'yjs'
import {Node} from "../../../entities";
import {useAtomValue} from "jotai/index";
import {YjsProviderAtom} from "../../../TreeState/YjsConnection";

export default function ChatView(props: { node: Node }) {
    const node = props.node
    //const provider = useAtomValue(YjsProviderAtom)
    let yMessages = node.ydata.get("yMessages");
    if (!yMessages) {
        yMessages = new YArray();
        node.ydata.set("yMessages", yMessages);
    }

    const [messages, setMessages] = useState(yMessages.toArray())
    const [input, setInput] = useState('')

    useEffect(() => {
        const updateMessages = () => setMessages(yMessages.toArray())
        yMessages.observe(updateMessages)
        return () => yMessages.unobserve(updateMessages)
    }, [])

    const sendMessage = () => {
        if (input.trim()) {
            yMessages.push([{text: input, time: Date.now()}])
            setInput('')
        }
    }

    return (
        <div className="p-4 max-w-md mx-auto space-y-4">
            <div className="border p-2 h-64 overflow-auto bg-gray-50">
                {messages.map((msg, i) => (
                    <div key={i} className="mb-1">
                        <span className="text-sm text-gray-600">{new Date(msg.time).toLocaleTimeString()}:</span>{' '}
                        <span>{msg.text}</span>
                    </div>
                ))}
            </div>
            <div className="flex space-x-2">
                <input
                    className="border p-2 flex-1"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} className="px-4 bg-blue-500 text-white rounded">
                    Send
                </button>
            </div>
        </div>
    )
}