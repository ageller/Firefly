import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="Firefly-vis",
    version="2.0.3",
    author = 'Alex Gurvich, Aaron Geller',
    author_email = 'agurvich@u.northwestern.edu, ageller@northwestern.edu',
    description="A browser-based particle visualization platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/ageller/Firefly",
    project_urls={
        "Bug Tracker": "https://github.com/ageller/Firefly/issues",
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
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
          'abg_python'
      ],
    include_package_data=True,
    scripts=["src/Firefly/bin/Firefly"]
)

