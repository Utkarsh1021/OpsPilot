#!/usr/bin/env bash
set -Eeuo pipefail

NAMESPACE="opspilot"
DEPLOYMENT="taskflow-backend"
CONTAINER="backend"
SERVICE="taskflow-backend"
NODE_CONTAINER="desktop-control-plane"
IMAGE_TAG="${1:-}"

if [[ $# -ne 1 ]] || [[ ! "$IMAGE_TAG" =~ ^opspilot-taskflow:[a-zA-Z0-9._-]+$ ]]; then
    echo "Usage: deploy-taskflow.sh opspilot-taskflow:<tag>" >&2
    exit 2
fi

for cmd in docker kubectl curl; do
    command -v "$cmd" >/dev/null || {
        echo "Required command not found: $cmd" >&2
        exit 1
    }
done

docker image inspect "$IMAGE_TAG" >/dev/null

PREVIOUS_IMAGE=$(kubectl get deployment "$DEPLOYMENT" \
    -n "$NAMESPACE" \
    -o jsonpath="{.spec.template.spec.containers[?(@.name=='${CONTAINER}')].image}")

if [[ -z "$PREVIOUS_IMAGE" ]]; then
    echo "Could not determine the currently deployed image." >&2
    exit 1
fi

if [[ "$PREVIOUS_IMAGE" == "$IMAGE_TAG" ]]; then
    echo "Requested image is already deployed: $IMAGE_TAG"
    exit 0
fi

UPDATED=0
PORT_FORWARD_PID=""

cleanup() {
    if [[ -n "$PORT_FORWARD_PID" ]]; then
        kill "$PORT_FORWARD_PID" 2>/dev/null || true
        wait "$PORT_FORWARD_PID" 2>/dev/null || true
    fi
}

on_exit() {
    STATUS=$?
    trap - EXIT

    cleanup

    if [[ "$STATUS" -ne 0 && "$UPDATED" -eq 1 ]]; then
        echo "Deployment verification failed. Rolling back to $PREVIOUS_IMAGE..."

        kubectl rollout undo "deployment/$DEPLOYMENT" \
            -n "$NAMESPACE" || true

        kubectl rollout status "deployment/$DEPLOYMENT" \
            -n "$NAMESPACE" --timeout=180s || true

        echo "Rollback attempted. Verify deployment health."
    fi

    exit "$STATUS"
}

trap on_exit EXIT

echo "Previous image: $PREVIOUS_IMAGE"
echo "Requested image: $IMAGE_TAG"

echo "Importing Docker image into Kubernetes containerd..."

docker save "$IMAGE_TAG" |
    docker exec -i "$NODE_CONTAINER" \
        ctr -n k8s.io images import -

echo "Updating Kubernetes Deployment..."

kubectl set image "deployment/$DEPLOYMENT" \
    "$CONTAINER=$IMAGE_TAG" \
    -n "$NAMESPACE"

UPDATED=1

echo "Waiting for rolling update..."

kubectl rollout status "deployment/$DEPLOYMENT" \
    -n "$NAMESPACE" --timeout=180s

echo "Starting temporary health-check port forward..."

kubectl port-forward \
    -n "$NAMESPACE" \
    "service/$SERVICE" 15000:5000 \
    >/tmp/opspilot-k8s-port-forward.log 2>&1 &

PORT_FORWARD_PID=$!

echo "Checking application and database health..."

HEALTH_OK=0

for attempt in $(seq 1 30); do
    if curl --silent --show-error --fail \
        http://127.0.0.1:15000/api/v1/health >/dev/null 2>&1 &&
       curl --silent --show-error --fail \
        http://127.0.0.1:15000/api/v1/health/db >/dev/null 2>&1; then
        HEALTH_OK=1
        break
    fi

    sleep 2
done

if [[ "$HEALTH_OK" -ne 1 ]]; then
    echo "Application or database health verification failed." >&2
    exit 1
fi

echo "Verifying final image..."

DEPLOYED_IMAGE=$(kubectl get deployment "$DEPLOYMENT" \
    -n "$NAMESPACE" \
    -o jsonpath="{.spec.template.spec.containers[?(@.name=='${CONTAINER}')].image}")

if [[ "$DEPLOYED_IMAGE" != "$IMAGE_TAG" ]]; then
    echo "Deployment image mismatch: $DEPLOYED_IMAGE" >&2
    exit 1
fi

echo "Kubernetes deployment successful."
echo "Image: $DEPLOYED_IMAGE"
echo "API health: PASS"
echo "Database health: PASS"
