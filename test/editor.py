import html

from fibers.tree import Node, Attr
from fibers.tree.node_attr.base import MessageResult


def find_title(markdown):
    title = None
    for line in markdown.split("\n"):
        line = line.strip()
        if line.startswith("# "):
            title = line[2:]
            title = title.strip()
            break
    return title

class EditorAttr(Attr):
    def __init__(self, node):
        super().__init__(node)


    def handle_message(self, message):
        if message["type"] not in ["updateContent", "addChild", "deleteSelf"]:
            return
        if message["type"] == "updateContent":
            print("old content", self.node.content)
            print("updateContent", message["content"])
            self.node.content = message["content"]
            title = find_title(message["content"])
            if title is not None and self.node.title != title:
                self.node.title = title
                return MessageResult().rerender(self.node)
            return MessageResult().rerender(self.node)

        if message["type"] == "addChild":
            n_children = len(self.node.children())
            child = self.node.new_child(title="Child " + str(n_children))
            EditorAttr(child)
            return MessageResult().rerender(self.node).rerender(child)
        if message["type"] == "deleteSelf":
            parent = self.node.parent()
            parent.remove_child(self.node)
            return MessageResult().rerender(self.node).rerender(parent).select(parent)

    def render(self, rendered):
        res = ["<Editor env_funcs={env_funcs} env_vars={env_vars} src={env_vars.node.data.editor_content}/>"]
        res.append('<SendMessage env_funcs={env_funcs} env_vars={env_vars} title="Add child" message={{type:"addChild"}}/>')
        #res.append(
        #    '<SendMessage env_funcs={env_funcs} env_vars={env_vars} title="Delete self" message={{type:"deleteSelf"}}/>')
        rendered.tabs["content"] = "".join(res)
        rendered.data["editor_content"] = self.node.content



if __name__ == '__main__':
    root = Node("root")
    root.content = "123"
    EditorAttr(root)
    root.display(dev_mode=True)