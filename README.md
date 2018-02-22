# Vesta

An api server (Node Express) template from [Vesta Rayan Afzar](http://vestarayanafzar.com)

This template is written in typescript.

## How to run

**Attention**
Do NOT clone this repository directly, use [Vesta](https://github.com/VestaRayanAfzar/vesta) to create your project.

`vesta create projectName --type=api`

use `vesta create --help` for more information 

### Development
Set `regenerateSchema` value to `true` from `src/config/config.var.ts`, for the first time to create the necessary tables.
Also after adding new models you have to change this to `true` to update database.
All your data will be erased if this value is set to `true`.

*Do NOT forget to change this value to false to prevent data loss*

To start the server first you have to run `npm run dev`.
Now your project is ready to be executed by docker. Just run `docker-compose up -d` within `vesta` directory.
The server will be listening on port `3000` (of course you can change it from docker-compose.yml in `vesta` directory) 
at your docker-machine address.
You can use [vesta](https://github.com/VestaRayanAfzar/vesta) code generator to create new models and controllers.
Use `vesta gen --help` for more information.
 
### Production
Production mode configuration file is located at `resources/gitignore/config.var.ts`.
There is a bash script in `resources/ci/deploy.sh` (change it to cover your needs).
`docker-compose.yml` for production mode is located at `resources/ci/docker/` which you can modify to cover your circumstances.
On target system (production) you have to install [vesta](https://github.com/VestaRayanAfzar/vesta) platform. Then run `vesta deploy [https://git/repo.git]`.

Current deploy script is set for reverse proxy behind nginx.
