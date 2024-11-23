from fibers.tree import Node

if __name__ == '__main__':
    root = Node("root")
    child = root.s("child")
    child.content = f"<NodeNavigateButton nodeId='{root.node_id}'  text='go to root'/>"
    root.content = f"<NodeNavigateButton nodeId='{child.node_id}'  text='go to child'/>"
    root.display(dev_mode=True)