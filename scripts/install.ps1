#Requires -Version 5.1
<#
.SYNOPSIS
    unipm installer for Windows
.DESCRIPTION
    Downloads and installs the latest version of unipm
.EXAMPLE
    irm https://raw.githubusercontent.com/opticalsecurity/unipm/master/scripts/install.ps1 | iex
.EXAMPLE
    .\install.ps1 -InstallDir "C:\Tools\unipm"
#>

[CmdletBinding()]
param(
    [string]$InstallDir = "$env:LOCALAPPDATA\unipm",
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"

# Configuration
$Repo = "opticalsecurity/unipm"
$BinaryName = "unipm.exe"

# Colors and formatting
function Write-Info { Write-Host "ℹ " -ForegroundColor Blue -NoNewline; Write-Host $args }
function Write-Success { Write-Host "✓ " -ForegroundColor Green -NoNewline; Write-Host $args }
function Write-Warn { Write-Host "⚠ " -ForegroundColor Yellow -NoNewline; Write-Host $args }
function Write-Err { Write-Host "✗ " -ForegroundColor Red -NoNewline; Write-Host $args }

# Detect architecture
function Get-Platform {
    $arch = if ([Environment]::Is64BitOperatingSystem) {
        if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
    } else {
        throw "32-bit Windows is not supported"
    }
    return "windows-$arch"
}

# Get latest version from GitHub
function Get-LatestVersion {
    $url = "https://api.github.com/repos/$Repo/releases/latest"
    try {
        $response = Invoke-RestMethod -Uri $url -Headers @{ "User-Agent" = "unipm-installer" }
        return $response.tag_name
    } catch {
        throw "Failed to fetch latest version: $_"
    }
}

# Calculate SHA256 hash
function Get-FileHash256 {
    param([string]$Path)
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLower()
}

# Verify checksum
function Test-Checksum {
    param(
        [string]$FilePath,
        [string]$ExpectedHash
    )
    
    $actualHash = Get-FileHash256 -Path $FilePath
    $expectedLower = $ExpectedHash.ToLower().Trim()
    
    if ($actualHash -ne $expectedLower) {
        Write-Err "Checksum verification failed!"
        Write-Err "Expected: $expectedLower"
        Write-Err "Actual:   $actualHash"
        return $false
    }
    
    Write-Success "Checksum verified"
    return $true
}

# Add to PATH
function Add-ToPath {
    param([string]$Dir)
    
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($currentPath -notlike "*$Dir*") {
        $newPath = "$currentPath;$Dir"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        $env:Path = "$env:Path;$Dir"
        Write-Info "Added $Dir to user PATH"
        Write-Warn "Restart your terminal to use unipm globally"
        return $true
    }
    return $false
}

# Main installation
function Install-Unipm {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║" -ForegroundColor Blue -NoNewline
    Write-Host "        " -NoNewline
    Write-Host "unipm Installer" -ForegroundColor Green -NoNewline
    Write-Host "                ║" -ForegroundColor Blue
    Write-Host "║" -ForegroundColor Blue -NoNewline
    Write-Host "   Universal Package Manager CLI       " -NoNewline
    Write-Host "║" -ForegroundColor Blue
    Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""

    # Detect platform
    Write-Info "Detecting platform..."
    $platform = Get-Platform
    Write-Success "Platform: $platform"

    # Get version
    Write-Info "Fetching latest version..."
    $targetVersion = if ($Version -eq "latest") { Get-LatestVersion } else { $Version }
    Write-Success "Version: $targetVersion"

    # Create install directory
    if (-not (Test-Path $InstallDir)) {
        Write-Info "Creating install directory: $InstallDir"
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    # Build URLs
    $baseUrl = "https://github.com/$Repo/releases/download/$targetVersion"
    $binaryUrl = "$baseUrl/unipm-$platform.exe"
    $checksumUrl = "$baseUrl/unipm-$platform.exe.sha256"

    # Create temp directory
    $tempDir = Join-Path $env:TEMP "unipm-install-$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    try {
        $tempBinary = Join-Path $tempDir $BinaryName
        $tempChecksum = Join-Path $tempDir "checksum.sha256"

        # Download binary
        Write-Info "Downloading unipm..."
        try {
            Invoke-WebRequest -Uri $binaryUrl -OutFile $tempBinary -UseBasicParsing
            Write-Success "Downloaded binary"
        } catch {
            Write-Err "Failed to download binary from $binaryUrl"
            throw $_
        }

        # Download and verify checksum
        Write-Info "Verifying integrity..."
        try {
            Invoke-WebRequest -Uri $checksumUrl -OutFile $tempChecksum -UseBasicParsing
            $expectedHash = (Get-Content $tempChecksum -Raw).Split()[0]
            if (-not (Test-Checksum -FilePath $tempBinary -ExpectedHash $expectedHash)) {
                throw "Checksum verification failed"
            }
        } catch [System.Net.WebException] {
            Write-Warn "Checksum file not available, skipping verification"
        }

        # Install binary
        Write-Info "Installing to $InstallDir..."
        $destPath = Join-Path $InstallDir $BinaryName
        
        # Remove existing binary if present
        if (Test-Path $destPath) {
            Remove-Item $destPath -Force
        }
        
        Move-Item $tempBinary $destPath -Force
        Write-Success "Installed successfully!"

        # Add to PATH
        Add-ToPath -Dir $InstallDir | Out-Null

        # Verify installation
        Write-Host ""
        Write-Success "unipm is ready to use!"
        Write-Host ""
        Write-Info "Run 'unipm help' to get started"
        Write-Info "Run 'unipm update-self' to update in the future"
        Write-Host ""

    } finally {
        # Cleanup
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# Run installer
try {
    Install-Unipm
} catch {
    Write-Err "Installation failed: $_"
    exit 1
}
