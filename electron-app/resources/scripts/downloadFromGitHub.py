"""
Download all files recursively from a GitHub repository subdirectory.

Usage:
    python -m downloadFromGitHub <destination_path> <user> <repo> <dir> <branch>

"""

import os
import sys
import requests

def download_dir(user, repo, github_path, branch, dest_root, github_path_org = None):
    """
    Recursively download the contents of a GitHub directory via the API.
    """
    api_url = f"https://api.github.com/repos/{user}/{repo}/contents/{github_path}?ref={branch}"
    response = requests.get(api_url)
    if response.status_code != 200:
        raise RuntimeError(f"GitHub API error: {response.status_code}, {response.text}")

    if (github_path_org is None):
        github_path_org = github_path

    for item in response.json():
        item_path = os.path.join(dest_root, os.path.relpath(item["path"], github_path_org))
        if item["type"] == "file":
            os.makedirs(os.path.dirname(item_path), exist_ok=True)
            print(f"Downloading {item['path']}...")
            file_response = requests.get(item["download_url"])
            file_response.raise_for_status()
            with open(item_path, "wb") as f:
                f.write(file_response.content)

        elif item["type"] == "dir":
            download_dir(user, repo, item["path"], branch, dest_root, github_path_org=github_path)

def main():

    dest = sys.argv[1]
    user = sys.argv[2]
    repo = sys.argv[3]
    directory = sys.argv[4]
    branch = sys.argv[5]


    if not all([dest, user, repo, directory, branch]):
        print("Error: please include the destination, user, repo, directory, branch arguments.")
        print("usage: python -m downloadFromGitHub <destination_path> <user> <repo> <dir> <branch>")

        sys.exit(1)

    os.makedirs(dest, exist_ok=True)

    print(f"Downloading from {user}/{repo}/{directory} (branch: {branch}) into {dest}")
    download_dir(user, repo, directory, branch, dest)
    print("Done.")

if __name__ == "__main__":
    main()
