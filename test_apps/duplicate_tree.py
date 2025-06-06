import json

import requests

from fibers.tree import Node
from forest.tree import push_tree


def duplicate_tree(tree_id, host="http://0.0.0.0:29999"):
    url = f'{host}/api/duplicateTree'
    payload = json.dumps({
        "origin_tree_id": str(tree_id),
    })
    headers = {
        'Content-Type': 'application/json'
    }
    response = requests.request("PUT", url, headers=headers, data=payload)
    response.raise_for_status()
    new_tree_id = response.json()['new_tree_id']
    print(f"{host}/?id="+new_tree_id)

if __name__ == '__main__':
    root = Node()
    root.content = "1234567"
    tree_id = push_tree(root)
    try:
        duplicate_tree(tree_id)
    except requests.HTTPError as e:
        print(f"Failed to duplicate tree: {e}")