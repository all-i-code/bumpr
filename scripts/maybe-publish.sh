#! /bin/bash

#
# If bumpr log is present and scope was not none, publish
#

NAME=$(node -e "console.log(require('./package.json').name)")
CMD="bumpr"

if [ "$NAME" = "bumpr" ]
then
    CMD="${PWD}/bin/cli.js"
fi

scope=$(${CMD} log scope)
if [ "$?" != "0" ]
then
    echo "Skipping publish because no scope found [${scope}]"
    exit 0
fi

if [ "$scope" = "none" ]
then
    echo Skipping publish because of "none" scope
    exit 0
fi

cat << EOF > .npmrc
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
EOF

yarn publish .
