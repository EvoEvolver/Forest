from fibers.tree import Node

if __name__ == '__main__':
    root = Node("root")
    root.content = """
    <ProseMirrorEditor/>
    """
    root.display(dev_mode=True)