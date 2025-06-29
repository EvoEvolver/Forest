import json

import requests

from fibers.gui.forest_connector.forest_connector import TreeData
from fibers.gui.renderer import Renderer
from fibers.tree import Node


def push_tree(root: Node, host="http://0.0.0.0:29999", token=None):
    tree_data = Renderer().render_to_json(root)
    push_tree_data(tree_data, host, token)

def push_tree_data(tree_data: TreeData, host="http://0.0.0.0:29999", token=None):
    url = f'{host}/api/createTree'
    root_id = tree_data["metadata"]["rootId"]
    payload = json.dumps({
        "tree": tree_data,
        "root_id": str(root_id),
    })
    headers = {
        'Content-Type': 'application/json'
    }
    if token is not None:
        headers['Authorization'] = f'Bearer {token}'
    response = requests.request("PUT", url, headers=headers, data=payload)
    response.raise_for_status()
    # get tree_id from response
    if response.status_code == 200:
        response_data = response.json()
        if 'tree_id' in response_data:
            tree_id = response_data['tree_id']
            print(f"Tree updated successfully with ID: {tree_id}")
            print(f"Created tree to {host}/?id={tree_id}")
            print(f"For dev, go to http://localhost:39999/?id={tree_id}")
            return tree_id
        else:
            print("Tree updated but no tree_id returned.")
    else:
        print(f"Failed to update tree: {response.status_code} - {response.text}")