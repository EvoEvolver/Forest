from fibers.tree import Node

if __name__ == '__main__':
    root = Node("root")
    child = root.s("child")
    child.content = ("<NodeNavigateButton env_funcs={env_funcs}")+f" nodeId='{root.node_id}'  text='go to root'/>"
    root.content = ("<NodeNavigateButton env_funcs={env_funcs}")+f" nodeId='{child.node_id}'  text='go to child'/>"
    root.display(dev_mode=True)