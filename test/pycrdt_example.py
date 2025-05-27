import asyncio
from httpx_ws import aconnect_ws
from pycrdt import Doc, Map, TransactionEvent
from pycrdt_websocket import WebsocketProvider
from pycrdt_websocket.websocket import HttpxWebsocket

async def client(ydoc):
    room_name = "240487138777229031721396632857162880898"
    async with (
        aconnect_ws(f"http://localhost:29999/{room_name}") as websocket,
        WebsocketProvider(ydoc, HttpxWebsocket(websocket, room_name)),
    ):
        # Changes to remote ydoc are applied to local ydoc.
        # Changes to local ydoc are sent over the WebSocket and
        # broadcast to all clients.
        def on_change(change: TransactionEvent):
            print("Change:", change.transaction)
        ydoc.observe(on_change)
        await asyncio.Future()  # run forever

async def main():
    ydoc = Doc()
    # Run the client non-blockingly
    asyncio.create_task(client(ydoc))
    # Add other tasks or logic here
    while True:
        print("Main loop running...")
        nodeDict = ydoc.get("nodeDict", type=Map)
        print("Current nodeDict:", nodeDict.__str__())
        await asyncio.sleep(1)

asyncio.run(main())