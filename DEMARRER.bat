@echo off
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel% equ 0 (
  py -3 local\bootstrap.py
) else (
  python local\bootstrap.py
)
if errorlevel 1 (
  echo.
  echo Si Python est absent, installez Python 3.10 ou plus depuis https://www.python.org/downloads/windows/
  echo Puis relancez ce fichier. Aucun Git ni compte n'est necessaire.
  pause
)
