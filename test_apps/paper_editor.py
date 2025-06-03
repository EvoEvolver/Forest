from fibers.gui.forest_connector.forest_connector import send_tree_to_backend
from fibers.gui.renderer import Rendered, Renderer
from fibers.tree import Node, Attr


class PaperEditor(Attr):
    def render(self, rendered: Rendered):
        rendered.tabs["content"] = "<PaperEditorMain/>"
        rendered.tools[0]["Operations"] = "<PaperEditorSide1/>"
        rendered.tools[1]["AI assistant"] = "<PaperEditorSide2/>"


if __name__ == '__main__':
    root = Node("root")
    PaperEditor(root)
    root.display(dev_mode=True)

    host = "https://treer.ai"
    #res = send_tree_to_backend(host, Renderer().render_to_json(root), root.node_id)