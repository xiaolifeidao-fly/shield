@echo off

REM 继续执行打包过程
call package.bat
if exist ".env" copy /Y ".env" "dist\"
call electron-builder --win --x64

