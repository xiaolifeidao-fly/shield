@echo off

if exist "dist" rmdir /s /q "dist"
mkdir "dist"
call webpack --config webpack.config.js --mode production

