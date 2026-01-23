#!/bin/bash

echo "Starting build script..."
TIMESTAMP="$(date +%s)"
echo $TIMESTAMP

echo "Building for environment:"
echo $ENV

echo "Reading ENV from:"
echo $S3_CONFIG
aws s3 cp ${S3_CONFIG} ./bin/deploy/env.yml
cat ./bin/deploy/env.yml

if [ "$ENV" == "staging" ]
then

  npm run sls:deploy:staging

elif [ "$ENV" == "development" ]
then

  npm run sls:deploy:development

elif [ "$ENV" == "beta" ]
then

  npm run sls:deploy:beta

elif [ "$ENV" == "production" ]
then

  npm run sls:deploy:prod

fi
