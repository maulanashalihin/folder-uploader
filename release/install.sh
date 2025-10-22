#!/usr/bin/env bash
set -euo pipefail

# s3-uploader Go installer for Ubuntu
# Usage: sudo bash install.sh [/opt/s3-uploader]

INSTALL_DIR=${1:-/opt/s3-uploader}
SERVICE_NAME=s3-uploader
ENV_FILE="$INSTALL_DIR/.env"

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)
    BIN_SRC="s3-uploader-go-linux-amd64"
    ;;
  aarch64|arm64)
    BIN_SRC="s3-uploader-go-linux-arm64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH" >&2
    exit 1
    ;;

esac

# Require root
if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash install.sh" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR"
cp -f "$BIN_SRC" "$INSTALL_DIR/s3-uploader-go"
chmod 755 "$INSTALL_DIR/s3-uploader-go"

# Provide env
if [[ -f "$ENV_FILE" ]]; then
  echo "Found existing $ENV_FILE (kept)."
else
  cp -f env.example "$ENV_FILE"
  echo "Created $ENV_FILE from env.example. Please edit values."
fi

# Create systemd unit
UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
cat > "$UNIT_FILE" <<'EOF'
[Unit]
Description=s3-uploader Go
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/opt/s3-uploader/.env
ExecStart=/opt/s3-uploader/s3-uploader-go
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# If custom install dir used, patch unit paths
if [[ "$INSTALL_DIR" != "/opt/s3-uploader" ]]; then
  sed -i "s#/opt/s3-uploader#$INSTALL_DIR#g" "$UNIT_FILE"
fi

# Reload and enable service
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

systemctl status --no-pager "$SERVICE_NAME" || true

echo "Installed $SERVICE_NAME to $INSTALL_DIR and started the service."
echo "Edit env at: $ENV_FILE"
echo "Logs: journalctl -u $SERVICE_NAME -f"