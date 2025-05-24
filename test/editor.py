from fibers.tree import Node

if __name__ == '__main__':
    root = Node("root")
    root.content = "<ProseMirrorEditor node={node}/><addChildrenButton node={node}/>"
    child = root.new_child("child1")
    child.content = "<ProseMirrorEditor node={node}/>"
    root.display(dev_mode=True)