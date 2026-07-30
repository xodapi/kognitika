@echo off
cd /d C:\project\kognitika
"C:\Program Files\nodejs\node.exe" --import tsx server.ts >> server.log 2>&1
