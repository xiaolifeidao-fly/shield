@echo off

REM 检查 resource/win 目录下是否存在 @img 和 sharp 文件夹
if exist "resource\win\@img" if exist "resource\win\sharp" (
    echo Found cached @img and sharp folders, copying to node_modules...
    REM 删除现有的文件夹
    if exist "node_modules\@img" rmdir /s /q "node_modules\@img"
    if exist "node_modules\sharp" rmdir /s /q "node_modules\sharp"
    
    REM 从缓存复制文件夹到 node_modules
    xcopy /E /I /Y "resource\win\@img" "node_modules\@img"
    xcopy /E /I /Y "resource\win\sharp" "node_modules\sharp"
) else (
    echo No cached folders found, installing sharp...
    REM 删除现有的文件夹
    if exist "node_modules\@img" rmdir /s /q "node_modules\@img"
    if exist "node_modules\sharp" rmdir /s /q "node_modules\sharp"
    
    REM 安装 sharp
    call npm install sharp
    
    REM 确保 resource/win 目录存在
    if not exist "resource\win" mkdir "resource\win"
    
    REM 复制到 resource/win 作为缓存
    xcopy /E /I /Y "node_modules\@img" "resource\win\@img"
    xcopy /E /I /Y "node_modules\sharp" "resource\win\sharp"
)
xcopy /E /I /Y "static\html" "..\resource\"
call webpack --config webpack.config.js --mode development
call electron .

