from fibers.tree import Node

if __name__ == '__main__':
    root = Node("root")
    child = root.s("child")
    child.content = f"<NodeNavigator nodeId='{root.node_id}'><a>Go to root</a></NodeNavigator>"
    root.content = f"<NodeNavigator nodeId='{child.node_id}'><a>Go to child</a></NodeNavigator>"
    root.display(dev_mode=True, interactive=True)