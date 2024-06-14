import os
import wget
import tarfile

current_file_directory = os.path.dirname(os.path.abspath(__file__))
project_root = current_file_directory
build_dir = os.path.join(project_root, 'dist')
asset_dir = os.path.join(build_dir, 'assets')  # Path to the assets directory
dist_url = "https://github.com/EvoEvolver/Forest/raw/build/dist.tar.gz"

def build():
    os.chdir(project_root)
    # check if dist folder exists
    if os.path.exists(build_dir):
        return

    wget.download(dist_url, 'dist.tar.gz')

    # Extract the tar file
    with tarfile.open('dist.tar.gz') as f:
        f.extractall()

    # Remove the tar file
    os.remove('dist.tar.gz')

def lazy_build():
    # check if dist folder exists and the index.html file exists
    if check_if_need_rebuild():
        build()


def check_if_need_rebuild() -> bool:
    dist_exist = os.path.exists(f'{project_root}/dist')
    if not dist_exist:
        return True


if __name__ == '__main__':
    lazy_build()
