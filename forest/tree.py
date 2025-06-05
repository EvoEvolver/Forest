import json

import requests

from fibers.gui.renderer import Renderer
from fibers.tree import Node


def push_tree(root: Node, host="http://0.0.0.0:29999"):
    url = f'{host}/api/updateTree'
    tree_data = Renderer().render_to_json(root)
    root_id = root.node_id
    payload = json.dumps({
        "tree": tree_data,
        "tree_id": str(root_id),
    })
    headers = {
        'Content-Type': 'application/json'
    }
    if host == "http://0.0.0.0:29999":
        print(f"Updating tree to http://0.0.0.0:39999/?id={root_id}")
    response = requests.request("PUT", url, headers=headers, data=payload)
    response.raise_for_status()
    return response