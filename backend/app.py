from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import threading
import time

# load trees.json.

import json


trees = json.load(open('testing/trees.json'))
keys = list(trees.keys())

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('connect')
def handle_connect():
    emit('Connected!')

def broadcast_message(socketio_instance):
    count = 1
    index = 0
    while True:
        tree = trees[keys[index]]
        socketio_instance.emit('tree', tree, broadcast=True) # TODO: Replace with the actual tree generator.
        count += 1
        if index == 2:
            index = 0
        else:
            index += 1
        time.sleep(1)
        break

if __name__ == '__main__':
    broadcast_thread = threading.Thread(target=broadcast_message, args=(socketio,))
    broadcast_thread.daemon = True
    broadcast_thread.start()
    socketio.run(app)