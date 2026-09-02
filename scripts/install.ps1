$ErrorActionPreference = 'Stop'

Write-Host "🚀 Tunnix CLI Windows Installer" -ForegroundColor Cyan

$ServerUrl = $env:TUNNIX_SERVER_URL
if (-not $ServerUrl) {
    $ServerUrl = "http://localhost:4310"
}

$Platform = "windows-amd64"
$DownloadUrl = "$ServerUrl/v1/download/$Platform"
$InstallDir = "$env:LOCALAPPDATA\Tunnix"
$ExePath = "$InstallDir\tunnix.exe"

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}

Write-Host "Downloading Tunnix CLI from $DownloadUrl..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath

Write-Host "✅ Installed Tunnix CLI to $ExePath" -ForegroundColor Green

# Add to User PATH if not present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    Write-Host "Added $InstallDir to User PATH." -ForegroundColor Yellow
}

Write-Host "Installation complete! Please restart your terminal and run 'tunnix version'." -ForegroundColor Green
