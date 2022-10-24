@ECHO OFF
set VSPath=C:\"Program Files"\"Microsoft Visual Studio"\2022\Community

call %VSPath%\VC\Auxiliary\Build\vcvarsall.bat amd64
del *.exe
cl /W4 main.c network_windows.c commands.c
ren *.exe server.exe
del *.obj
exit 0