<#
.SYNOPSIS
    Initializes OpenSource Assist database with verified demo user and curated mock data.
#>

[CmdletBinding()]
param ()

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$RepoRoot = (Get-Item $ScriptDir).Parent.FullName

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     Initializing OpenSource Assist Demo Environment      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

Push-Location $RepoRoot
try {
    uv run python devops/init_demo_data.py
} finally {
    Pop-Location
}
