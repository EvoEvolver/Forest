import datetime
import os
import wget
import tarfile

current_file_directory = os.path.dirname(os.path.abspath(__file__))
project_root = current_file_directory
build_dir = os.path.join(project_root, 'dist')
asset_dir = os.path.join(build_dir, 'assets')  # Path to the assets directory
dist_url = "https://github.com/EvoEvolver/Forest/raw/build/dist.tar.gz"


def download_new_dist():
    # remove the build directory
    os.system(f"rm -rf {build_dir}")
    print("Forest: Downloading new dist...")
    wget.download(dist_url, build_dir + '.tar.gz')
    # Extract the tar file
    with tarfile.open(build_dir + '.tar.gz') as f:
        f.extractall(project_root)
    # Remove the tar file
    os.remove(build_dir + '.tar.gz')
    print("Forest: New dist downloaded!")
    update_check_date()


def lazy_build():
    # check if dist folder exists and the index.html file exists
    if check_if_need_rebuild():
        os.chdir(project_root)
        download_new_dist()

def update_check_date():
    with open(os.path.join(build_dir, 'last_check.txt'), 'w') as f:
        f.write(datetime.datetime.today().strftime("%Y-%m-%d"))

def check_if_need_rebuild() -> bool:
    dist_exist = os.path.exists(build_dir)
    if not dist_exist:
        return True

    # check last_check.txt in the dist folder
    last_check_file = os.path.join(build_dir, 'last_check.txt')
    if os.path.exists(last_check_file):
        with open(last_check_file, 'r') as f:
            last_check_data = f.read().strip()
        # last_check is like 2021-09-01
        # we parse the data and calculate the difference with today
        last_check_data = datetime.datetime.strptime(last_check_data, "%Y-%m-%d")
        today = datetime.datetime.today()
        delta = today - last_check_data
        # if today is the same day as the last check, we don't need to rebuild
        if delta.days < 1:
            return False

    version_url = "https://raw.githubusercontent.com/EvoEvolver/Forest/build/version.txt"
    version_url_path = os.path.join(build_dir, 'latest_version.txt')
    if os.path.exists(version_url_path):
        os.remove(version_url_path)
    latest_version_file = wget.download(version_url, version_url_path)
    with open(latest_version_file, 'r') as f:
        latest_version_hash = f.read().strip()
    # if there is no version.txt, it means the dist is under development
    if not os.path.exists(os.path.join(build_dir, 'version.txt')):
        return False
    with open(os.path.join(build_dir, 'version.txt'), 'r') as f:
        version_hash = f.read().strip()
    # compare the version with the version.txt in the dist folder
    update_check_date()
    if version_hash != latest_version_hash:
        print(f"Cached version: {version_hash}")
        print(f"Latest version: {latest_version_hash}")
        print("Need to download!")
        return True
    return False



if __name__ == '__main__':
    #download_new_dist()
    lazy_build()
