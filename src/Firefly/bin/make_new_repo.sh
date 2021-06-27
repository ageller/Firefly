#!/bin/bash

here=`pwd`
REPONAME=`basename $here`
TOKEN=$HOME/.github.token

read -p "Name of new repo? (enter for $REPONAME): " ANS_REPONAME 
read -p "Github username? (enter for $USER): " ANS_USER
read -p "Path to github OAUTH token? (enter for $TOKEN): " ANS_TOKEN

TOKEN=${ANS_TOKEN:-${TOKEN}}

if [ ! -f $TOKEN ]; then 
    echo No OAUTH token file matching $TOKEN, generate one from \
    https://github.com/settings/tokens and write it to disk somewhere. >& 2
    exit 1
else
    TOKEN=`cat $TOKEN`
    REPONAME=${ANS_REPONAME:-${REPONAME}}
    USER=${ANS_USER:-${USER}}
    ## create the new repository
    curl -u ${USER}:${TOKEN} https://api.github.com/user/repos -d "{\"name\": \"${REPONAME}\""

    ## set the remote to be new repository
    #git remote add origin http://github.com/${USER}/${REPONAME}

    echo "# ${REPONAME}" > README.md
    git add README.md
if [ -f index.html]; then
    git add index.html
else
    echo Missing index.html >& 2
    exit 1
fi
if [ -d static]; then
    git add --all static
else
    echo Missing static directory >& 2
    exit 1
fi
    git commit -m 'initial commit'
    git remote add origin git@github.com:${USER}/${REPONAME}.git
    git push --set-upstream origin master

    ## enable github pages
    curl -u ${USER}:${TOKEN} \
    -H "Accept: application/vnd.github.switcheroo-preview+json" \
    https://api.github.com/repos/${USER}/${REPONAME}/pages \
    -d '{"source":{"branch":"master","path":"/"}}'

    echo Check the status of your new github pages site at: \
    https://github.com/${USER}/${REPONAME}/settings/pages \
    or visit it at ${USER}.github.io/${REPONAME}
fi
