@echo off
title Blobfish Adventure
cd /d "%~dp0"

echo.
echo   ============================================
echo      BLOBFISH ADVENTURE
echo   ============================================
echo.
echo   On this PC:  http://localhost:8123/
echo.
echo   On the tablet, use one of these (same Wi-Fi):
rem 169.254.* are dead link-local addresses (Bluetooth, VPN, unplugged NICs) - hide them
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "169.254."') do (
  set "IP=%%a"
  call :show
)
echo.
echo   Leave this window open while playing.
echo   Close it (or press Ctrl+C) to stop.
echo.

start "" http://localhost:8123/
python -m http.server 8123 --bind 0.0.0.0
goto :eof

:show
set "IP=%IP: =%"
echo        http://%IP%:8123/
goto :eof
