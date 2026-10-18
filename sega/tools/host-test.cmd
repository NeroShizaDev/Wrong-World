@echo off
rem Нативная проверка движка Mega Drive через MSVC (Visual Studio Build Tools).
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
if not exist "%ROOT%\out\host" mkdir "%ROOT%\out\host"
cl /nologo /W4 /WX /utf-8 /DWW_HOST /I "%ROOT%\src" "%ROOT%\tools\host_test.c" "%ROOT%\src\ww_engine.c" "%ROOT%\src\story_data.c" "%ROOT%\src\font_data.c" /Fo"%ROOT%\out\host\\" /Fe"%ROOT%\out\host\host_test.exe" || exit /b 1
rem main.c проверяется против заглушки SGDK: синтаксис, типы и вызовы API без настоящей приставки.
cl /nologo /c /W4 /WX /utf-8 /I "%ROOT%\tools\sgdk_stub" /I "%ROOT%\src" "%ROOT%\src\main.c" /Fo"%ROOT%\out\host\main_check.obj" || exit /b 1
"%ROOT%\out\host\host_test.exe"
