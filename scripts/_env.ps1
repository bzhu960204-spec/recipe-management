# Pins the toolchain so no global JAVA_HOME / PATH setup is required.
$ErrorActionPreference = 'Stop'

$env:JAVA_HOME = 'C:\Users\bob.zhu\jdk-17.0.19+10'
$env:PATH = "$env:JAVA_HOME\bin;C:\Users\bob.zhu\apache-maven-3.9.16\bin;C:\Users\bob.zhu\node-v24.14.1-win-x64;$env:PATH"

$RepoRoot = Split-Path -Parent $PSScriptRoot
