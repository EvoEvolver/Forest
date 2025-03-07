from fibers.tree import Node

if __name__ == '__main__':
    node = Node("root")
    node.content = """<Expandable> <TextSpan text="{"/><TeX src="\\frac{a}{b}"/> <TextSpan text="}"/> </Expandable>"""
    node.display(dev_mode=True)