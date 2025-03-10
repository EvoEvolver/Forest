from fibers.tree import Node

if __name__ == '__main__':
    root = Node("root").be("root content")
    child1 = root.s("child1").be("content1")
    child2 = root.s("child2").be("content2")
    child3 = child2.s("child3").be("content3")
    child1.add_child(child3)
    new_node = Node(123)
    child1.add_child(new_node)
    child2.add_child(new_node)
    root.update_subtree_parents()
    for node in root.iter_subtree_with_bfs():
        print(node.content)
    root.display(dev_mode=True)