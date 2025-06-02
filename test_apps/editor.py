from fibers.tree import Node

if __name__ == '__main__':
    root = Node("root")
    root.content = """
    <PaperEditorMain/>
    """
    root.node_id = 123456
    root.display(dev_mode=True)