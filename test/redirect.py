from fibers.tree import Node

if __name__ == '__main__':
    node = Node("root")
    child = node.s("A")
    child = child.s("B")
    child.content = ("<NodeNavigateButton modifyTree={modifyTree} ")+f" nodeId='{node.node_id}' />"
    node.display()