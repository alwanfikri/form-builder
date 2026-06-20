@echo off
set PATH=C:\Program Files\nodejs;C:\Users\alwan\AppData\Roaming\npm;%PATH%
cd /d "%~dp0"
pnpm --filter @form-builder/web dev
