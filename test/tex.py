from fibers.tree import Node

if __name__ == '__main__':
    node = Node("root")
    node.content = "<TeX src='\\frac{a}{b}'/>"
    node.add_child(Node("child1"))
    node.display(dev_mode=True)