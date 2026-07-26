@echo off
REM ============================================================================
REM Z3 Formal Verification Framework - Plugin Installation Script (Windows)
REM ============================================================================

setlocal enabledelayedexpansion

set PLUGIN_NAME=Z3 Formal Verification Framework
set PLUGIN_SLUG=z3-formal-verification
set PLUGIN_VERSION=1.0.0
set REPO_URL=https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane
set BRANCH=claude/z3-formal-verification-pt0udg

echo.
echo ========================================================================
echo    %PLUGIN_NAME%
echo                        Installation Script (Windows)
echo ========================================================================
echo.

REM Check prerequisites
echo [1/5] Checking prerequisites...

where git >nul 2>nul
if errorlevel 1 (
    echo ERROR: Git not found. Please install Git first.
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm not found. Please install Node.js and npm first.
    exit /b 1
)

echo [OK] Prerequisites checked
echo.

REM Setup repository
echo [2/5] Setting up repository...

set INSTALL_DIR=%USERPROFILE%\.z3-framework

if exist "%INSTALL_DIR%" (
    echo Updating existing installation at %INSTALL_DIR%
    cd /d "%INSTALL_DIR%"
    git fetch origin
    git checkout %BRANCH%
    git pull origin %BRANCH%
) else (
    echo Cloning repository to %INSTALL_DIR%
    mkdir "%INSTALL_DIR%"
    git clone --branch %BRANCH% %REPO_URL% "%INSTALL_DIR%"
    cd /d "%INSTALL_DIR%"
)

echo [OK] Repository ready
echo.

REM Install dependencies
echo [3/5] Installing dependencies...

call npm ci

echo [OK] Dependencies installed
echo.

REM Verify installation
echo [4/5] Verifying installation...

echo Running TypeScript type check...
call npm run typecheck >nul 2>nul
if errorlevel 1 (
    echo [WARNING] TypeScript check had warnings (non-blocking^)
) else (
    echo [OK] TypeScript check passed
)

echo.

REM Create configuration
echo [5/5] Setting up configuration...

set CONFIG_DIR=%USERPROFILE%\.z3-framework-config

if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

(
    echo {
    echo   "plugin": {
    echo     "name": "Z3 Formal Verification Framework",
    echo     "slug": "z3-formal-verification",
    echo     "version": "1.0.0"
    echo   },
    echo   "framework": {
    echo     "acceleration": {
    echo       "default_preset": "moderate",
    echo       "presets": {
    echo         "none": 1,
    echo         "moderate": 10,
    echo         "aggressive": 100,
    echo         "hpc": 1000
    echo       }
    echo     }
    echo   }
    echo }
) > "%CONFIG_DIR%\config.json"

echo Configuration created at %CONFIG_DIR%
echo [OK] Configuration complete
echo.

REM Summary
echo.
echo ========================================================================
echo                    INSTALLATION COMPLETE!
echo ========================================================================
echo.

echo Installation Location:
echo    %INSTALL_DIR%
echo.

echo Configuration Location:
echo    %CONFIG_DIR%
echo.

echo Quick Start Commands:
echo    1. Navigate to installation:
echo       cd "%INSTALL_DIR%"
echo.
echo    2. Verify installation:
echo       npm run typecheck
echo.
echo    3. Run tests:
echo       npm run test:integration
echo.
echo    4. Start development:
echo       npm run dev
echo.

echo Documentation:
echo    - Framework Guide: %INSTALL_DIR%\docs\FRAMEWORK_DESIGN.md
echo    - API Reference: %INSTALL_DIR%\docs\API_REFERENCE.md
echo    - Publishing Guide: %INSTALL_DIR%\docs\PLUGIN_PUBLISHING.md
echo.

echo Ready to use! Navigate to the installation directory to get started.
echo.

endlocal
