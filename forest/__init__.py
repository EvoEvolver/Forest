import os

current_file_directory = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_file_directory)
build_dir = os.path.join(project_root, 'dist')
asset_dir = os.path.join(build_dir, 'assets')  # Path to the assets directory


def build():
    os.chdir(project_root)
    os.system('npm install && npm run build')

def lazy_build():
    # check if dist folder exists and the index.html file exists
    if not os.path.exists(build_dir) or not os.path.exists(os.path.join(build_dir, 'index.html')):
        build()

if __name__ == '__main__':
    build()