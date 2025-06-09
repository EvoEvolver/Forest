import html

from fibers.gui.renderer import Rendered
from fibers.tree import Node, Attr
from forest.tree import push_tree

with open(
        "/reader/mineru_main.html",
        "r", encoding="utf-8") as f:
    html_source = f.read()

class MyAttr(Attr):
    def render(self, rendered: Rendered):
        rendered.tabs["content"] = f"""<HTMLContent html="{html.escape(html_source)}"/>"""


if __name__ == '__main__':
    root = Node("root")
    MyAttr(root)
    push_tree(root)