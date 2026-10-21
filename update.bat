@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Updating Tab Status...
echo.
git pull --ff-only
if errorlevel 1 (
  echo.
  echo Update failed. Make sure Git is installed and this folder came from "git clone".
  pause
  exit /b 1
)
echo.
echo Done. Open the Tab Status popup and press the update button,
echo or press the reload button on the extension in brave://extensions
pause
