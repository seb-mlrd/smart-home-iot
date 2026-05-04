@echo off
setlocal enabledelayedexpansion

REM Determine the directory where this script is located
for %%i in ("%~dp0.") do set "APP_HOME=%%~fi"

REM Setup the classpath - use short names to avoid spaces issues
set "CLASSPATH=%APP_HOME%\.mvn\wrapper\maven-wrapper.jar"
set "PROJECTBASEDIR=%APP_HOME%"

REM Find Java
if defined JAVA_HOME (
    set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
) else (
    set "JAVA_EXE=java.exe"
)

REM Check if Java is available
%JAVA_EXE% -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: JAVA_HOME is not set and Java is not in PATH
    exit /b 1
)

REM Set Maven home to a predictable location
set "MAVEN_HOME=%APP_HOME%\.mvn\wrapper\dists\apache-maven-3.9.6"

REM Execute Maven wrapper with proper argument handling
setlocal disabledelayedexpansion
%JAVA_EXE% -classpath "%CLASSPATH%" "-Dmaven.multiModuleProjectDirectory=%PROJECTBASEDIR%" "-Dmaven.home=%MAVEN_HOME%" org.apache.maven.wrapper.MavenWrapperMain %*
set ERROR_CODE=%ERRORLEVEL%
endlocal
exit /b %ERROR_CODE%
