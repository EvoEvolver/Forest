

from fibers.tree import Node

if __name__ == '__main__':
    node = Node("root")
    node.content = '''
<Tooltip title="hello">
<Box>
Put your mouse over me to see the tooltip
</Box>
</Tooltip>
'''
    node.display(dev_mode=True)