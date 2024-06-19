import mllm

from fibers.tree import Node, Attr
from fibers.tree.node_attr.base import MessageResult


class GetSummary(Attr):

    def __init__(self, node):
        super().__init__(node)
        self.summary = None

    def render(self, rendered):
        rendered.tabs["summary"] = '<SendMessage env_funcs={env_funcs} env_vars={env_vars} title="Summarize" message="get_summary"/>'
        if self.summary is not None:
            rendered.tabs["summary"] += "<p>" + self.summary + "</p>"

    def handle_message(self, message):
        if message["message"] != "get_summary":
            return
        print("Getting summary")
        chat = mllm.Chat()
        chat += "Give a summary of the following content: <>"
        chat += self.node.content
        chat += "</>"
        res = chat.complete()
        self.summary = res
        return MessageResult().rerender(self.node)


if __name__ == '__main__':
    node = Node("root")
    node.content = "We’ve identified some crucial, yet often neglected, lessons and methodologies informed by machine learning that are essential for developing products based on LLMs. Awareness of these concepts can give you a competitive advantage against most others in the field without requiring ML expertise! Over the past year, the six of us have been building real-world applications on top of LLMs. We realized that there was a need to distill these lessons in one place for the benefit of the community."
    GetSummary(node)
    node.display(dev_mode=True)
