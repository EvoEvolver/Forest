import os
import subprocess

current_file_directory = os.path.dirname(os.path.abspath(__file__))
project_root = current_file_directory
build_dir = os.path.join(project_root, 'dist')
asset_dir = os.path.join(build_dir, 'assets')  # Path to the assets directory


def build():
    try:
        os.chdir(project_root)
        subprocess.call(['npm', 'install'])
        subprocess.call(['npm', 'run', 'build'])
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
    if check_if_need_rebuild():
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
