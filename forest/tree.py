import json

import requests

from fibers.gui.renderer import Renderer
from fibers.tree import Node


def push_tree(root: Node, host="http://0.0.0.0:29999"):
    url = f'{host}/api/createTree'
    tree_data = Renderer().render_to_json(root)
    root_id = root.node_id
    payload = json.dumps({
        "tree": tree_data,
        "root_id": str(root_id),
    })
    headers = {
        'Content-Type': 'application/json'
    }
    response = requests.request("PUT", url, headers=headers, data=payload)
    response.raise_for_status()
    # get tree_id from response
    if response.status_code == 200:
        response_data = response.json()
        if 'tree_id' in response_data:
            tree_id = response_data['tree_id']
            print(f"Tree updated successfully with ID: {tree_id}")
            print(f"Created tree to {host}/?id={tree_id}")
            return tree_id
        else:
            print("Tree updated but no tree_id returned.")
    else:
        print(f"Failed to update tree: {response.status_code} - {response.text}")