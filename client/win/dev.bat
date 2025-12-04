@echo off

xcopy /E /I /Y "static\html" "..\resource\"
call webpack --config webpack.config.js --mode development
call electron .

