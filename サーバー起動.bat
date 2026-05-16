@echo off
chcp 65001 > nul
echo.
echo ========================================
echo   まなびゲーム スマホ公開サーバー
echo ========================================
echo.
echo 管理者権限でサーバーを起動します...
echo.

:: 管理者権限で PowerShell を起動
powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File ""%~dp0server.ps1""' -Verb RunAs"
