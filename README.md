
# Firefly

[![PyPI](https://img.shields.io/pypi/v/Firefly)](https://pypi.org/project/Firefly)
<a href="https://ascl.net/1810.021"><img src="https://img.shields.io/badge/ascl-1810.021-blue.svg?colorB=262255" alt="ascl:1810.021" /></a>

![logo banner](https://github.com/ageller/Firefly/blob/main/docs/source/_static/four_view_banner.png?raw=true)


Firefly is an interactive viewer for any particle-based data. A live example is available [here](https://ageller.github.io/Firefly/)
or if you're ready to get started creating your own interactive viewer, [click here](https://firefly.rcs.northwestern.edu/docs/data_reader).

If you use Firefly, please cite our [ApJS paper](https://ui.adsabs.harvard.edu/abs/2023ApJS..265...38G/abstract) and our [entry in the Astrophysics Source Code Library (ASCL)](http://adsabs.harvard.edu/abs/2018ascl.soft10021G).

## You are on the `website` branch

This branch is not the Firefly package. It carries the project **homepage** and the
**built documentation**, and it is the branch the production web server checks out.

| path | what it is |
|---|---|
| `website/` | Jekyll source for the homepage. `website/_site/` is the built output, and it is committed — the web server serves that directory directly. |
| `docs/` | Sphinx source plus `docs/build/html/`, the built documentation. Also committed, also served directly. |
| everything else | merged in from `main`, so this branch stays close to the package it documents. |

Because the built output is committed, the server never builds anything — it only
pulls. Nothing needs restarting after a homepage or docs update; nginx serves the
files straight off disk.

### Building the homepage

The site is plain Jekyll with no `Gemfile`, no theme and no plugins, so bare
`jekyll` is all you need — no bundler.

If you work in a conda environment, install the compilers alongside ruby.
conda-forge's ruby records `x86_64-conda-linux-gnu-cc` as its compiler, and Ruby 3.4
no longer ships `bigdecimal` as a default gem — so a gem install has to compile
something, and fails with `The compiler failed to generate an executable file`
if the compilers are missing:

```bash
conda install -c conda-forge ruby compilers make pkg-config
gem install jekyll --no-document
```

Then, from the `website` directory:

```bash
jekyll build                  # writes website/_site
jekyll serve --livereload     # preview on http://127.0.0.1:4000
```

Commit `website/_site` along with whatever source you changed. The server serves the
built output, so a change that was never built is a change that never appears.

`website/README.md` covers the rest: how the page is assembled, how to add a gallery
entry (each thumbnail is committed as both a `.webp` and a `.png`), and the caveats
around the hero's live-demo iframe.

### Publishing a change

Changes flow one way: here → deployment repository → server. The server only pulls.

1. **Here**, on this branch: edit, `jekyll build`, commit, push.

2. **In your local clone of the deployment repository** — see *Keeping a Deployment
   Copy in Sync* below for the one-time `upstream` setup:

   ```bash
   git checkout website
   git fetch upstream
   git merge upstream/website
   git push origin website
   ```

3. **On the server**, in the deployment clone checked out on `website`:

   ```bash
   git status     # confirm nothing was edited in place
   git pull
   ```

   If someone edited files directly on the server, `git pull` will refuse. Look at
   what changed first and carry anything worth keeping back into this repository,
   then clear them with `git checkout -- .` before pulling. The server's directory
   paths are recorded in the deployment repository's `howTos/`, deliberately not here.

## Additional Docs

Comprehensive documentation is available [here](https://firefly.rcs.northwestern.edu/docs).

## Keeping a Deployment Copy in Sync

If you host Firefly on a server from your own repository — a fork of this one carrying
site-specific settings, data and launch scripts — keep it as a **fork** and merge from
here, rather than copying files across. A copy script has to overwrite everything from
upstream while preserving your local edits; that is exactly what a merge already does,
and it does it correctly.

Run the merge on your own machine. The server only ever pulls.

**One-time setup**, in your local clone of the deployment repository:

```bash
git remote add upstream https://github.com/ageller/Firefly.git
git fetch upstream
```

If that repository was ever cloned on Windows it may have CRLF line endings committed,
which makes every line of a file look modified and turns every merge into a conflict.
Fix it once, before the first merge, by copying this repository's `.gitattributes` into
yours and running:

```bash
git add --renormalize .
git commit -m "normalize line endings to LF"
```

**To pick up a new Firefly release**, still in your local clone of the deployment
repository:

```bash
git checkout -b sync-upstream     # work on a branch, not on the default one
git fetch upstream
git merge upstream/main           # resolve any conflicts, then commit
```

Test locally, then merge the branch into your default branch and push it.

```bash
git checkout main
git merge --ff-only sync-upstream
git push origin main
```

**On the server**, in the deployment repository:

```bash
git pull
```

then restart whatever serves the app (for example, the gunicorn service).

### Keeping the merges painless

Merges stay clean for as long as your customizations live in files this repository
never touches. Some ways to arrange that:

- Put site-specific choices in your dataset's settings `.json` instead of in code.
  GUI panels can be hidden with `GUIExcludeList`, a list of GUI paths such as
  `"main/general/data/loadNewData"`, so hiding a control needs no source change.
- To add markup to the `<head>` of every page — an analytics tag, extra meta tags —
  drop a `templates/_extra_head.html` into your repository. Every template already
  includes it if it exists, so you never have to edit the shared templates.
- If the instance is exposed on the open internet, run it in **public mode**: set
  `FIREFLY_PUBLIC=1` in the server's environment (this is the one that works under
  gunicorn/wsgi) or pass `--public` to the `firefly` command. That refuses the
  endpoints which accept data or settings for a live viewer session, and keeps a
  single fixed room so visitors are never prompted for a session name.
- Keep server-specific launch scripts in their own files.
- Leave packaged files you don't need in place rather than deleting them; deletions
  become modify/delete conflicts every time upstream edits them.

## Contributors 
### Primary Developers
* Aaron Geller
* Alex Gurvich
### Past Contributors 
* Mike Cronin
* Zach Hafen
* Alessandro Febretti
### Student Contributors
* Mahlet Shiferaw 
* Luolei Zhao
* Nora Linzer
### Project PI
* Claude-André Faucher-Giguère 


## Acknowledgments
Firefly is written in WebGL using the three.js library.
This tool builds off of a [previous version developed by Alessandro Febretti](https://github.com/nuitrcs/firefly). 

This project is funded by [Northwestern's Center for Interdisciplinary Exploration and Research in Astrophysics (CIERA)](https://ciera.northwestern.edu/),  [Northwestern's IT Research Computing group](https://www.it.northwestern.edu/research/index.html), and NSF grants AST-1412836, AST-1715216, and CAREER award AST-1652522 awarded to [Claude-André Faucher-Giguère](https://www.physics.northwestern.edu/people/faculty/core-faculty/claude-andre-faucher-giguere.html).


## Additional Info
Firefly was originally designed for [FIRE](http://galaxies.northwestern.edu/fire-simulations/) data, but has since been extended to support any particle data.
This package should not be confused with the serendipitously named web-based visualization software [Firefly, from Caltech-IPAC](https://github.com/Caltech-IPAC/firefly), a general tool for retrieving and viewing astronomy data.
