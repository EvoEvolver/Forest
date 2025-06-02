from fibers.gui.renderer import Rendered
from fibers.tree import Node, Attr


class PaperEditor(Attr):
    def render(self, rendered: Rendered):
        rendered.tabs["content"] = "<ProseMirrorEditor/>"
        rendered.tools[0]["Operations"] = "<PaperEditorSide/>"


if __name__ == '__main__':
    root = Node("root")
    PaperEditor(root)
    root.node_id = 123456
    root.display(dev_mode=True)