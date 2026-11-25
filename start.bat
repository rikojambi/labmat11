@echo off
chcp 65001 >nul
title LABMAT SMK XI - Server Lokal
cd /d "%~dp0"
set "PORT=8765"
echo ============================================
echo   LABMAT SMK XI - Laboratorium Matematika
echo   Menjalankan server lokal di port %PORT%
echo ============================================
echo.
where node >nul 2>&1
if %errorlevel%==0 goto usenode
where py >nul 2>&1
if %errorlevel%==0 goto usepy
where python >nul 2>&1
if %errorlevel%==0 goto usepython
echo Node.js atau Python tidak ditemukan.
echo Install Node.js (https://nodejs.org) atau Python (https://python.org), lalu jalankan ulang.
pause
exit /b 1

:usenode
start "LABMAT-SMK-XI Server" /min node "%~dp0server.js" %PORT%
goto launch

:usepy
start "LABMAT-SMK-XI Server" /min py -3 -m http.server %PORT% --bind 127.0.0.1
goto launch

:usepython
start "LABMAT-SMK-XI Server" /min python -m http.server %PORT% --bind 127.0.0.1

:launch
timeout /t 2 >nul
start "" "http://localhost:%PORT%/index.html"
echo.
echo Aplikasi dibuka di browser. Tutup jendela server untuk menghentikan.
echo Jika browser tidak terbuka, buka manual: http://localhost:%PORT%/index.html
echo.
pause
