#!/usr/bin/env bash

CLONE_PATH=$1
DEPLOY_PATH=$2
NGINX_PATH=/etc/nginx/conf.d/vesta-api.conf
WD=`pwd`
counter=0

print_status(){
  ((counter=counter+1))
  echo
  echo "${counter}: $1>"
  echo
}

cd ${CLONE_PATH}
print_status "Cloning SubModules"
git checkout master
git submodule update --init src/cmn
git submodule foreach git checkout master
mv resources/gitignore/config.var.ts src/config/config.var.ts

print_status "Executing pre-deploy Script"
chmod +x resources/ci/scripts/pre-deploy.js
./resources/ci/scripts/pre-deploy.js

print_status "Installing Node Packages"
npm install
print_status "Running Deploy Tasks"
npm run deploy

#print_status "Configuring NGINX"
#mkdir /vesta/ssl
#mv resources/ci/ssl /vesta/
#sudo mv resources/ci/nginx/api.conf ${NGINX_PATH}

print_status "Installing node packages for Api Server"
cp package.json vesta/server/package.json
cd vesta/server
npm install --production

cd ${WD}
if [ -d ${DEPLOY_PATH} ]; then
  print_status "Stopping Previously Running Containers"
  cd ${DEPLOY_PATH}
  docker-compose stop
  docker-compose down
  cd ${WD}
fi

rm -rf ${DEPLOY_PATH}
mkdir -p ${DEPLOY_PATH}
mv ${CLONE_PATH}/vesta/server ${DEPLOY_PATH}/app
mv ${CLONE_PATH}/resources/ci/docker/docker-compose.yml ${DEPLOY_PATH}/docker-compose.yml

print_status "Starting Containers"
cd ${DEPLOY_PATH}
docker-compose up -d --build

#print_status "Re-Starting NGINX"
#sudo service nginx restart

print_status "All done"
exit 0