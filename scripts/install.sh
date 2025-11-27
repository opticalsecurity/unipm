#!/usr/bin/env bash
# unipm installer for Linux and macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/opticalsecurity/unipm/master/scripts/install.sh | bash

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="opticalsecurity/unipm"
BINARY_NAME="unipm"
INSTALL_DIR="${UNIPM_INSTALL_DIR:-$HOME/.local/bin}"

# Logging functions
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; }

# Detect OS and architecture
detect_platform() {
    local os arch

    case "$(uname -s)" in
        Linux*)  os="linux" ;;
        Darwin*) os="darwin" ;;
        *)       error "Unsupported OS: $(uname -s)"; exit 1 ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64)  arch="x64" ;;
        arm64|aarch64) arch="arm64" ;;
        *)             error "Unsupported architecture: $(uname -m)"; exit 1 ;;
    esac

    echo "${os}-${arch}"
}

# Get the latest release version from GitHub
get_latest_version() {
    local url="https://api.github.com/repos/${REPO}/releases/latest"
    
    if command -v curl &> /dev/null; then
        curl -fsSL "$url" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/'
    elif command -v wget &> /dev/null; then
        wget -qO- "$url" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/'
    else
        error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi
}

# Download a file
download() {
    local url="$1"
    local dest="$2"

    if command -v curl &> /dev/null; then
        curl -fsSL "$url" -o "$dest"
    elif command -v wget &> /dev/null; then
        wget -q "$url" -O "$dest"
    fi
}

# Verify SHA256 checksum
verify_checksum() {
    local file="$1"
    local expected="$2"

    local actual
    if command -v sha256sum &> /dev/null; then
        actual=$(sha256sum "$file" | awk '{print $1}')
    elif command -v shasum &> /dev/null; then
        actual=$(shasum -a 256 "$file" | awk '{print $1}')
    else
        warn "No SHA256 tool found, skipping verification"
        return 0
    fi

    if [[ "${actual,,}" != "${expected,,}" ]]; then
        error "Checksum verification failed!"
        error "Expected: $expected"
        error "Actual:   $actual"
        return 1
    fi

    success "Checksum verified"
    return 0
}

# Add install directory to PATH in shell config
add_to_path() {
    local shell_config=""
    local path_line="export PATH=\"\$PATH:$INSTALL_DIR\""

    # Detect shell config file
    case "$SHELL" in
        */zsh)  shell_config="$HOME/.zshrc" ;;
        */bash) 
            if [[ -f "$HOME/.bashrc" ]]; then
                shell_config="$HOME/.bashrc"
            elif [[ -f "$HOME/.bash_profile" ]]; then
                shell_config="$HOME/.bash_profile"
            fi
            ;;
        */fish) 
            shell_config="$HOME/.config/fish/config.fish"
            path_line="set -gx PATH \$PATH $INSTALL_DIR"
            ;;
    esac

    if [[ -n "$shell_config" ]]; then
        if ! grep -q "$INSTALL_DIR" "$shell_config" 2>/dev/null; then
            echo "" >> "$shell_config"
            echo "# unipm" >> "$shell_config"
            echo "$path_line" >> "$shell_config"
            info "Added $INSTALL_DIR to PATH in $shell_config"
            warn "Run 'source $shell_config' or restart your terminal to use unipm"
        fi
    else
        warn "Could not detect shell config file"
        warn "Please add $INSTALL_DIR to your PATH manually"
    fi
}

# Main installation
main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}        ${GREEN}unipm Installer${NC}                ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}   Universal Package Manager CLI       ${BLUE}║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo ""

    # Detect platform
    info "Detecting platform..."
    local platform
    platform=$(detect_platform)
    success "Platform: $platform"

    # Get latest version
    info "Fetching latest version..."
    local version
    version=$(get_latest_version)
    if [[ -z "$version" ]]; then
        error "Could not determine latest version"
        exit 1
    fi
    success "Latest version: $version"

    # Create install directory
    if [[ ! -d "$INSTALL_DIR" ]]; then
        info "Creating install directory: $INSTALL_DIR"
        mkdir -p "$INSTALL_DIR"
    fi

    # Build download URLs
    local base_url="https://github.com/${REPO}/releases/download/${version}"
    local binary_url="${base_url}/${BINARY_NAME}-${platform}"
    local checksum_url="${base_url}/${BINARY_NAME}-${platform}.sha256"

    # Create temp directory
    local tmp_dir
    tmp_dir=$(mktemp -d)
    trap "rm -rf $tmp_dir" EXIT

    local binary_path="${tmp_dir}/${BINARY_NAME}"
    local checksum_path="${tmp_dir}/${BINARY_NAME}.sha256"

    # Download binary
    info "Downloading unipm..."
    if ! download "$binary_url" "$binary_path"; then
        error "Failed to download binary from $binary_url"
        exit 1
    fi
    success "Downloaded binary"

    # Download and verify checksum
    info "Verifying integrity..."
    if download "$checksum_url" "$checksum_path" 2>/dev/null; then
        local expected_hash
        expected_hash=$(cat "$checksum_path" | awk '{print $1}')
        verify_checksum "$binary_path" "$expected_hash"
    else
        warn "Checksum file not available, skipping verification"
    fi

    # Install binary
    info "Installing to $INSTALL_DIR..."
    chmod +x "$binary_path"
    mv "$binary_path" "${INSTALL_DIR}/${BINARY_NAME}"
    success "Installed successfully!"

    # Add to PATH if needed
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        add_to_path
    fi

    # Verify installation
    echo ""
    if command -v unipm &> /dev/null || [[ -x "${INSTALL_DIR}/${BINARY_NAME}" ]]; then
        success "unipm is ready to use!"
        echo ""
        info "Run 'unipm help' to get started"
        info "Run 'unipm update-self' to update in the future"
    else
        warn "Installation complete, but unipm is not in PATH yet"
        info "Add $INSTALL_DIR to your PATH, then run 'unipm help'"
    fi
    echo ""
}

main "$@"
