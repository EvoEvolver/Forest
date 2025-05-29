

from fibers.tree import Node

if __name__ == '__main__':
    node = Node("root")
    node.content = '''<FigureBox><img alt="Refer to caption" class="ltx_graphics ltx_centering ltx_img_landscape" height="171" id="S5.F3.g1" src="https://arxiv.org/html/2408.08463v1/extracted/5736015/subject_decomp.jpg" style="object-fit: contain;" width="500"/>
    </FigureBox>
'''
    node.display(dev_mode=True)