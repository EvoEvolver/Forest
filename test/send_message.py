from fibers.tree import Node, Attr
from fibers.tree.node_attr.base import MessageResult


class MessagePrint(Attr):

    def __init__(self, node):
        super().__init__(node)
        self.content = "<SendMessage env_funcs={env_funcs} env_vars={env_vars}/>"

    def render(self, rendered):
        rendered.tabs["content"] = self.content

    def handle_message(self, message):
        self.content += "<p> 123 </p>"
        res = MessageResult()
        res.node_to_re_render.add(self.node)
        return res


if __name__ == '__main__':
    node = Node("root")
    child = node.s("A")
    child = child.s("B")
    MessagePrint(child)
    node.display(dev_mode=True)
