import os
import subprocess

current_file_directory = os.path.dirname(os.path.abspath(__file__))
project_root = current_file_directory
build_dir = os.path.join(project_root, 'dist')
asset_dir = os.path.join(build_dir, 'assets')  # Path to the assets directory

def check_nodejs_installed():
    try:
        print("* Checking nodejs version")
        subprocess.run(['node', '--version'])
    except FileNotFoundError:
        print("Nodejs is not installed")
        return False
    return True


def build():
    try:
        os.chdir(project_root)
        if not check_nodejs_installed():
            print("Nodejs is not installed.")
            print("Solution 1: run `conda install nodejs` if you are using conda")
            print("Solution 2: install nodejs from https://nodejs.org/en")
            raise Exception("Nodejs is not installed")
        print("* Installing npm packages (if slow, you might need change npm source)")
        subprocess.run(['npm', 'install'])
        print("* Building the project")
        subprocess.run(['npm', 'run', 'build'])
        update_last_build_log()
    except Exception as e:
        print("Build Failed")
        print(e)


def get_git_revision_hash() -> str:
    # check if .git folder exists in the parent directory
    parent_dir = os.path.dirname(project_root)
    if not os.path.exists(f'{parent_dir}/.git'):
        return "non-git-repo-mode"
    return subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=project_root).decode(
        'ascii').strip()


def lazy_build():
    # check if dist folder exists and the index.html file exists
    if check_if_need_rebuild() or True:
        build()


def check_if_need_rebuild() -> bool:
    # read last_build.txt if not return True
    try:
        last_build_hash = get_git_revision_hash()
        if last_build_hash == "non-git-repo-mode":
            return not os.path.exists(f'{project_root}/dist')
        f = open(f'{project_root}/last_build.log', "r")
        last_build = f.read()
        if get_git_revision_hash() != last_build:
            return True
        else:
            return False
    except FileNotFoundError:
        print("file not found")
        return True


def update_last_build_log():
    build_hash = get_git_revision_hash()
    f = open(f'{project_root}/last_build.log', "w")
    f.write(build_hash)


if __name__ == '__main__':
    lazy_build()
