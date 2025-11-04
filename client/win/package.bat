@echo off

if exist "dist" rmdir /s /q "dist"
mkdir "dist"
REM tsc
call webpack --config webpack.config.js --mode production

