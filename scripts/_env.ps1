# Pins the toolchain when the bundled paths exist, otherwise falls back to the
# machine's already-configured JAVA_HOME / PATH so the scripts are portable.
$ErrorActionPreference = 'Stop'

# Preferred (developer machine) install locations. Override per-machine by setting
# KL_JAVA_HOME / KL_MAVEN_BIN / KL_NODE_DIR before running the scripts.
$preferredJavaHome = if ($env:KL_JAVA_HOME) { $env:KL_JAVA_HOME } else { 'C:\Users\bob.zhu\jdk-17.0.19+10' }
$preferredMavenBin = if ($env:KL_MAVEN_BIN) { $env:KL_MAVEN_BIN } else { 'C:\Users\bob.zhu\apache-maven-3.9.16\bin' }
$preferredNodeDir  = if ($env:KL_NODE_DIR)  { $env:KL_NODE_DIR }  else { 'C:\Users\bob.zhu\node-v24.14.1-win-x64' }

# Only pin JAVA_HOME if the bundled JDK actually exists on this machine.
# Otherwise keep whatever JAVA_HOME the machine already has configured.
if (Test-Path $preferredJavaHome) {
    $env:JAVA_HOME = $preferredJavaHome
}
elseif (-not $env:JAVA_HOME -or -not (Test-Path $env:JAVA_HOME)) {
    throw "JAVA_HOME is not set to a valid JDK. Set JAVA_HOME (or KL_JAVA_HOME) to a JDK 17+ install."
}

# Prepend the bundled tool dirs to PATH only when they exist, so a machine with
# its own Maven/Node on PATH still works.
$pathPrefix = @()
if (Test-Path "$env:JAVA_HOME\bin") { $pathPrefix += "$env:JAVA_HOME\bin" }
if (Test-Path $preferredMavenBin)   { $pathPrefix += $preferredMavenBin }
if (Test-Path $preferredNodeDir)    { $pathPrefix += $preferredNodeDir }
if ($pathPrefix.Count -gt 0) {
    $env:PATH = "$($pathPrefix -join ';');$env:PATH"
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
