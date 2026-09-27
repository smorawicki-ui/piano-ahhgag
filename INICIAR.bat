@echo off
echo Iniciando PianoChord...
start python serve.py
timeout /t 2 /nobreak >nul
start http://localhost:8080
