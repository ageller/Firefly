import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="firefly",
    author = 'Alex Gurvich, Aaron Geller',
    author_email = 'alex.b.gurvich@gmail.com, a-geller@northwestern.edu',
    description="A browser-based particle visualization platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://firefly.rcs.northwestern.edu/",
    project_urls={
        "Bug Tracker": "https://github.com/ageller/Firefly/issues",
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: GNU Affero General Public License v3 or later (AGPLv3+)",
        "Operating System :: OS Independent",
    ],
    package_dir={"": "src"},
    packages=setuptools.find_packages(where="src"),
    python_requires=">=3.6",
    install_requires=[            
          'numpy',
          'h5py',
          'pandas',
          'eventlet',
          'flask-socketio',
          'flask',
          'requests',
          'abg_python>=1.1.1'
      ],
    include_package_data=True,
    scripts=["src/firefly/bin/firefly"],
    use_scm_version=True,
    setup_requires=["setuptools>=61", "setuptools_scm"]
)

