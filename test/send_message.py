from fibers.tree import Node, Attr


class MessagePrint(Attr):
    def render(self, rendered):
        rendered.tabs["content"] = "<SendMessage env_funcs={env_funcs} env_vars={env_vars}/>"

    def handle_message(self, message):
        print(message)

if __name__ == '__main__':
    node = Node("root")
    child = node.s("A")
    child = child.s("B")
    MessagePrint(child)
    node.display(dev_mode=True)