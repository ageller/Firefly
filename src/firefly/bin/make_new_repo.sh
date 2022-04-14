#!/bin/bash

here=`pwd`
REPONAME=`basename $here`
TOKEN=$HOME/.github.token

REPONAME=${1:-`read -p "Name of new repo? (enter for $REPONAME): " ANS_REPONAME `}
USER=${2:-`read -p "Github username? (enter for $USER): " ANS_USER`}
TOKEN=${3:-`read -p "Path to github OAUTH token? (enter for $TOKEN): " ANS_TOKEN`}

TOKEN=${ANS_TOKEN:-${TOKEN}}

if [ ! -f $TOKEN ]; then 
    echo No OAUTH token file matching $TOKEN, generate one from \
    https://github.com/settings/tokens and write it to disk somewhere. >& 2
    exit 1
else
    TOKEN=`cat $TOKEN`
    ## create a new remote repository
    curl -u ${USER}:${TOKEN} https://api.github.com/user/repos -d "{\"name\": \"${REPONAME}\""
    
    ## create a new local repository
    git init
    
    ## make a dummy readme
    echo "# ${REPONAME}" > README.md
    echo "This repository was created automatically by \
    https://github.com/ageller/Firefly/blob/main/src/firefly/bin/make_new_repo.sh \
    you can make your own by installing firefly." >> README.md
    git add README.md
    
    ## track the firefly index.html
    if [ -f index.html ]; then
        git add index.html
    else
        echo Missing index.html >& 2
        exit 1
    fi
    ## track the static source files
    if [ -d static ]; then
        git add --all static
    else
        echo Missing static directory >& 2
        exit 1
    fi
    git commit -m 'initial commit'
    ## push local repo to remote repo
    git remote add origin git@github.com:${USER}/${REPONAME}.git
    git push --set-upstream origin master

    ## enable github pages
    curl -u ${USER}:${TOKEN} \
    -H "Accept: application/vnd.github.switcheroo-preview+json" \
    https://api.github.com/repos/${USER}/${REPONAME}/pages \
    -d '{"source":{"branch":"master","path":"/"}}'

    echo Check the status of your new github pages site at: \
    https://github.com/${USER}/${REPONAME}/settings/pages \
    or visit it at https://${USER}.github.io/${REPONAME}
fi
