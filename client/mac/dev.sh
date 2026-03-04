
cp -rf static/html ../resource/
cp -f .env dist/.env
webpack --config webpack.config.js --mode development
electron .
