from fibers.tree import Node

if __name__ == '__main__':
    root = Node("root")
    root.content = "<ChatView/>"
    child = root.new_child("child1")
    child.content = "<ChatView/>"
    root.display(dev_mode=True)