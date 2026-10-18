@echo off
rem Снимки экранов Mega Drive из настоящего main.c без эмулятора (MSVC + заглушки VDP).
setlocal
set "ROOT=%~dp0.."
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
for /f "tokens=*" %%i in ('call "%VSWHERE%" -latest -products * -property installationPath') do set "VS=%%i"
if not defined VS (
  echo Visual Studio Build Tools не найдены.
  exit /b 1
)
rem vcvars64 сам ищет vswhere и пишет об этом в stderr — это не ошибка.
call "%VS%\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1 || exit /b 1
if not exist "%ROOT%\out\host\screens" mkdir "%ROOT%\out\host\screens"
set "FLAGS=/nologo /W4 /utf-8 /D_CRT_SECURE_NO_WARNINGS /I "%ROOT%\tools\sgdk_stub" /I "%ROOT%\src""
cl %FLAGS% /c /Dmain=ww_sega_main "%ROOT%\src\main.c" /Fo"%ROOT%\out\host\sega_main.obj" || exit /b 1
cl %FLAGS% "%ROOT%\tools\screen_preview.c" "%ROOT%\out\host\sega_main.obj" "%ROOT%\src\ww_engine.c" "%ROOT%\src\story_data.c" "%ROOT%\src\font_data.c" /Fo"%ROOT%\out\host\\" /Fe"%ROOT%\out\host\screen_preview.exe" || exit /b 1
pushd "%ROOT%"
"%ROOT%\out\host\screen_preview.exe"
popd
