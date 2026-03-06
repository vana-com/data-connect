#!/usr/bin/env bash
# Deploy data-connect-cloud to a GCP Compute Engine VM.
#
# Usage:
#   ./cloud-server/deploy/gcp-deploy.sh [create|update|ssh|teardown]
#
# Prerequisites:
#   - gcloud CLI authenticated
#   - Docker image built locally or in GCR
#
# The script creates a VM, installs Docker, pushes the image to GCR,
# pulls it on the VM, and runs it with docker compose.

set -euo pipefail

PROJECT="corsali-development"
ZONE="us-central1-a"
VM_NAME="data-connect-cloud"
MACHINE_TYPE="e2-medium"
IMAGE_NAME="gcr.io/${PROJECT}/data-connect-cloud"
FIREWALL_TAG="data-connect-cloud"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

create_firewall_rules() {
  log "Creating firewall rules..."

  # API + n.eko HTTP + WebRTC
  gcloud compute firewall-rules create allow-${FIREWALL_TAG} \
    --project="$PROJECT" \
    --direction=INGRESS \
    --action=ALLOW \
    --rules=tcp:3000,tcp:8080,tcp:59000,udp:59000 \
    --target-tags="$FIREWALL_TAG" \
    --source-ranges=0.0.0.0/0 \
    --description="data-connect-cloud: API (3000), n.eko (8080), WebRTC (59000)" \
    2>/dev/null || log "Firewall rule already exists, skipping."
}

create_vm() {
  log "Creating VM ${VM_NAME}..."

  gcloud compute instances create "$VM_NAME" \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --tags="$FIREWALL_TAG" \
    --image-family=ubuntu-2404-lts-amd64 \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=30GB \
    --scopes=storage-ro \
    --metadata=startup-script='#!/bin/bash
      if ! command -v docker &>/dev/null; then
        curl -fsSL https://get.docker.com | sh
        usermod -aG docker $(logname || echo ubuntu)
      fi
    '

  log "Waiting for VM to be ready..."
  sleep 30

  # Wait for Docker to be installed
  for i in $(seq 1 12); do
    if gcloud compute ssh "$VM_NAME" --project="$PROJECT" --zone="$ZONE" \
      --command="docker --version" 2>/dev/null; then
      break
    fi
    log "Waiting for Docker install... (attempt $i/12)"
    sleep 10
  done

  create_firewall_rules
  log "VM created. External IP:"
  gcloud compute instances describe "$VM_NAME" \
    --project="$PROJECT" --zone="$ZONE" \
    --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
}

build_and_push() {
  log "Building and pushing Docker image..."
  cd "$REPO_ROOT"
  docker build -f cloud-server/Dockerfile -t "$IMAGE_NAME" .
  docker push "$IMAGE_NAME"
}

deploy_to_vm() {
  local EXTERNAL_IP
  EXTERNAL_IP=$(gcloud compute instances describe "$VM_NAME" \
    --project="$PROJECT" --zone="$ZONE" \
    --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

  log "Deploying to VM (IP: ${EXTERNAL_IP})..."

  # Copy the production compose file
  gcloud compute scp \
    "${REPO_ROOT}/cloud-server/deploy/docker-compose.prod.yml" \
    "${VM_NAME}:~/docker-compose.yml" \
    --project="$PROJECT" --zone="$ZONE"

  # Pull and run on the VM
  gcloud compute ssh "$VM_NAME" --project="$PROJECT" --zone="$ZONE" --command="
    sudo gcloud auth configure-docker gcr.io --quiet &&
    sudo docker pull ${IMAGE_NAME} &&
    sudo docker compose down 2>/dev/null || true
    sudo sh -c 'export PUBLIC_IP=${EXTERNAL_IP} && docker compose up -d' &&
    sleep 5 &&
    sudo docker compose logs --tail=20
  "

  log "Deployed! Access at:"
  log "  API:  http://${EXTERNAL_IP}:3000"
  log "  Neko: http://${EXTERNAL_IP}:8080"
}

do_ssh() {
  gcloud compute ssh "$VM_NAME" --project="$PROJECT" --zone="$ZONE"
}

do_teardown() {
  log "Tearing down VM ${VM_NAME}..."
  gcloud compute instances delete "$VM_NAME" \
    --project="$PROJECT" --zone="$ZONE" --quiet
  log "VM deleted."
}

case "${1:-}" in
  create)
    create_vm
    build_and_push
    deploy_to_vm
    ;;
  update)
    build_and_push
    deploy_to_vm
    ;;
  ssh)
    do_ssh
    ;;
  teardown)
    do_teardown
    ;;
  *)
    echo "Usage: $0 [create|update|ssh|teardown]"
    echo "  create   - Create VM, build image, deploy"
    echo "  update   - Rebuild image and redeploy"
    echo "  ssh      - SSH into the VM"
    echo "  teardown - Delete the VM"
    exit 1
    ;;
esac
