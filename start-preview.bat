@echo off
cd /d C:\project\kognitika
"C:\Program Files\nodejs\node.exe" C:\project\kognitika\node_modules\vite\bin\vite.js preview --port 4173 --host >> preview.log 2>&1
