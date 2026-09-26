@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
echo Initializing OpenSource Assist demo environment...
uv run python devops/init_demo_data.py
endlocal
