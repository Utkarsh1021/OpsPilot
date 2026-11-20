# OpsPilot

### Local DevOps automation platform for TaskFlow

OpsPilot is a hands-on DevOps lab that brings together infrastructure provisioning, configuration management, containerization, CI/CD, Kubernetes orchestration, and monitoring around a Node.js TaskFlow REST API.

The repository contains two related parts:

- **TaskFlow application:** an Express API backed by PostgreSQL, packaged as a Docker image and deployed with Docker Compose or Kubernetes.
- **OpsPilot infrastructure:** Terraform, Ansible, Puppet, Jenkins, Nagios, Prometheus, Grafana, Blackbox Exporter, and Kubernetes configurations used to automate and observe the application.

> **Deployment scope:** The verified environment is a local Windows 11 + WSL2 Ubuntu + Docker Desktop setup. The current repository does not implement the previously proposed Cloudflare public deployment. Kubernetes is running locally through Docker Desktop Kubernetes. This is a demonstrable DevOps lab, not a claim of production cloud hosting or multi-node high availability.

---

## Contents

- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository layout](#repository-layout)
- [TaskFlow API](#taskflow-api)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Docker Compose deployment](#docker-compose-deployment)
- [Infrastructure automation](#infrastructure-automation)
- [Kubernetes deployment](#kubernetes-deployment)
- [Monitoring and observability](#monitoring-and-observability)
- [Jenkins CI/CD pipeline](#jenkins-cicd-pipeline)
- [Verification results](#verification-results)
- [Useful commands](#useful-commands)
- [Security and operational notes](#security-and-operational-notes)
- [Known limitations](#known-limitations)

---

## Architecture

### End-to-end delivery flow

A push to the GitHub main branch is discovered by the Jenkins Pipeline job. Jenkins validates the repository, installs dependencies, runs security audits and tests, builds a uniquely tagged Docker image, and deploys that image through two deployment targets.

~~~mermaid
flowchart TD
    Dev[Developer] --> Git[GitHub Repository]
    Git --> Jenkins[Jenkins Pipeline]

    Jenkins --> Validate[Repository Validation]
    Validate --> Audit[Dependency Audits]
    Audit --> Tests[Syntax Check and 18 Automated Tests]
    Tests --> Build[Build opspilot-taskflow:BUILD_NUMBER]

    Build --> Ansible[Ansible Deployment]
    Build --> K8s[Kubernetes Deployment]

    Ansible --> Compose[Docker Compose]
    Compose --> Nginx[Nginx Reverse Proxy]
    Nginx --> API1[TaskFlow Backend Replicas]
    API1 --> DB1[(PostgreSQL)]

    K8s --> Deploy[Kubernetes Deployment]
    Deploy --> API2[TaskFlow Backend Pods]
    API2 --> DB2[(PostgreSQL StatefulSet)]
    DB2 --> PVC[(PersistentVolumeClaim)]

    Jenkins --> NagiosConfig[Ansible Nagios Configuration]
    NagiosConfig --> Nagios[Nagios Health Verification]

    API2 --> Prom[Prometheus]
    Prom --> Grafana[Grafana Dashboard]
    Prom --> Blackbox[Blackbox Exporter]
    Prom --> KSM[kube-state-metrics]
~~~

### Runtime deployment views

**Docker Compose environment**

- PostgreSQL 16 is the database service.
- The Node.js backend runs as three Compose replicas in the managed deployment.
- Nginx provides the HTTP entry point and distributes requests to the backend service.
- PostgreSQL data is stored in the named Docker volume, postgres_data.
- The Compose deployment is managed by the Ansible taskflow_deploy role.

**Kubernetes environment**

- Namespace: opspilot
- Backend: Deployment with three baseline replicas and rolling updates.
- Service: ClusterIP service named taskflow-backend.
- Database: PostgreSQL StatefulSet with a 2 GiB PersistentVolumeClaim.
- Configuration: ConfigMap plus the separately created taskflow-credentials Secret.
- Scaling: HPA with a minimum of 3 and maximum of 10 replicas, targeting 50% average CPU utilization.
- Availability: PodDisruptionBudget with minAvailable set to 2.
- Health: startup, readiness, and liveness probes.

**Monitoring environment**

- Namespace: opspilot-monitoring
- Prometheus scrapes itself, kube-state-metrics, Blackbox Exporter, and the TaskFlow API and database health endpoints.
- Grafana is provisioned with a Prometheus datasource and an OpsPilot dashboard.
- Nagios monitors Jenkins, the TaskFlow API, the Nagios web interface, and PostgreSQL.

---

## Technology stack

| Area | Tools / technologies | Purpose |
|---|---|---|
| Source control | Git, GitHub | Version control and source repository |
| CI/CD | Jenkins Pipeline | Validation, tests, image build, deployment orchestration |
| Application | Node.js 22, Express 5 | TaskFlow REST API |
| Database | PostgreSQL 16 | Persistent application data |
| Containerization | Docker, Docker Compose | Image creation and local multi-container deployment |
| Reverse proxy | Nginx | HTTP entry point and backend traffic distribution |
| Infrastructure as Code | Terraform, Docker provider | Local Docker networks and Nginx test container |
| Configuration management | Ansible | Environment setup, TaskFlow deployment, Nagios configuration, Puppet apply |
| Configuration management | Puppet | Declarative package, service, file, and template examples |
| Orchestration | Kubernetes, Kustomize | Deployments, StatefulSet, Services, storage, scaling and availability |
| Metrics | Prometheus | Metrics scraping and retention |
| Dashboard | Grafana | Metrics visualization |
| Probe monitoring | Blackbox Exporter | HTTP probe checks |
| Kubernetes metrics | kube-state-metrics | Kubernetes object-state metrics |
| Service monitoring | Nagios Core | Jenkins, API, web UI and PostgreSQL checks |
| Local environment | Windows 11, WSL2, Ubuntu, Docker Desktop | Development and execution environment |

---

## Repository layout

The following reflects the current repository structure (not a proposed future layout).

~~~text
OpsPilot/
├── apps/
│   └── backend-node/
│       ├── nginx/
│       │   └── nginx.conf
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── routes/
│       │   ├── app.js
│       │   └── server.js
│       ├── tests/
│       ├── .env.example
│       ├── Dockerfile
│       ├── docker-compose.yml
│       └── package.json
├── infrastructure/
│   ├── ansible/
│   │   ├── inventory/
│   │   ├── playbooks/
│   │   └── roles/
│   │       ├── docker_setup/
│   │       ├── nagios_monitoring/
│   │       ├── puppet_apply/
│   │       ├── setup_environment/
│   │       └── taskflow_deploy/
│   ├── kubernetes/
│   │   ├── monitoring/
│   │   ├── scripts/
│   │   └── taskflow/
│   │       ├── backend/
│   │       ├── postgres/
│   │       └── tests/
│   ├── puppet/
│   │   ├── manifests/
│   │   └── modules/opspilot_base/
│   └── terraform/
│       └── docker-lab/
├── Jenkinsfile
├── .gitignore
└── README.md
~~~

---

## TaskFlow API

TaskFlow is the application used to exercise the deployment and monitoring workflows.

### API capabilities

- User registration and login.
- JWT-based authentication middleware.
- Authenticated task operations.
- PostgreSQL-backed user, category, and task data.
- Request hardening with Helmet.
- JSON request handling and CORS middleware.
- Health and instance endpoints for deployment verification.

### Important endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | / | API welcome response |
| GET | /api/v1/health | Application health check |
| GET | /api/v1/health/db | Database connectivity check |
| GET | /api/v1/instance | Identify the backend instance |
| POST | /api/v1/auth/register | Register a user |
| POST | /api/v1/auth/login | Authenticate a user |
| GET | /api/v1/auth/me | Get the authenticated user profile |
| / | /api/v1/tasks | Authenticated task routes |

The task routes support creating, listing, retrieving, updating, and deleting tasks. See the route and controller files for request and authorization details.

### Run application tests

From the repository root:

~~~bash
cd apps/backend-node
npm ci
npm test
~~~

The tests use Node.js's built-in test runner and Supertest.

---

## Prerequisites

### Host environment

The verified local setup uses:

- Windows 11 with WSL2.
- Ubuntu 24.04 under WSL2.
- Docker Desktop with WSL integration enabled.
- Docker Desktop Kubernetes enabled for the Kubernetes workflow.
- Git.
- Node.js 22 and npm.
- Terraform 1.5 or later.
- Ansible and the Ansible community.docker collection.
- Puppet Agent.
- Jenkins, Nagios Core, kubectl, and curl for the integrated local lab.

Docker Engine is provided by Docker Desktop in this setup. Do not install a second Docker Engine inside WSL when using Docker Desktop's WSL integration.

### Verify core tools

~~~bash
docker version
docker compose version
kubectl version --client
node --version
npm --version
terraform version
ansible --version
puppet --version
~~~

The Jenkins pipeline also depends on host-level deployment wrappers under /usr/local/lib/opspilot. These wrappers and their restricted sudoers rules are machine configuration; they are not created by cloning this repository.

---

## Local setup

### 1. Clone the repository

~~~bash
git clone https://github.com/Utkarsh1021/OpsPilot.git
cd OpsPilot
~~~

### 2. Configure TaskFlow environment variables

The Compose file reads configuration from apps/backend-node/.env. The tracked .env.example is only a minimal starter, so create a local .env and add the application/database settings required by docker-compose.yml.

~~~bash
cd apps/backend-node
cp .env.example .env
chmod 600 .env
~~~

Edit .env locally. Define these variables with your own values:

~~~dotenv
PORT=5000
NODE_ENV=production

POSTGRES_DB=taskflow_db
POSTGRES_USER=replace_with_local_db_user
POSTGRES_PASSWORD=replace_with_a_strong_local_password

DB_NAME=taskflow_db
DB_USER=replace_with_local_db_user
DB_PASSWORD=replace_with_the_same_local_password

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1h

# Optional image override; the default is opspilot-taskflow:local
TASKFLOW_IMAGE=opspilot-taskflow:local
~~~

Do not commit .env. The repository's .gitignore excludes environment files. Use unique local credentials and keep the file permission restricted.

Return to the repository root when following the remaining commands:

~~~bash
cd ../..
~~~

---

## Docker Compose deployment

The Compose definition is in apps/backend-node/docker-compose.yml. It defines PostgreSQL, the TaskFlow backend, and Nginx.

### 1. Build the backend image

The Compose file references an image tag; it does not define a Docker build section. Build the image before starting the stack:

~~~bash
cd apps/backend-node
docker build -t opspilot-taskflow:local .
~~~

### 2. Start the services

~~~bash
docker compose up -d --scale backend=3
~~~

### 3. Verify containers and application health

~~~bash
docker compose ps
curl --fail http://127.0.0.1/api/v1/health
curl --fail http://127.0.0.1/api/v1/health/db
~~~

Expected local endpoints:

| Service | Address |
|---|---|
| TaskFlow API through Nginx | http://127.0.0.1 |
| Application health | http://127.0.0.1/api/v1/health |
| Database health | http://127.0.0.1/api/v1/health/db |
| PostgreSQL host binding | 127.0.0.1:5434 |

The backend container port is 5000. PostgreSQL is exposed on host port 5434 and Nginx on host port 80, both bound to loopback.

### 4. Stop the Compose stack

From apps/backend-node:

~~~bash
docker compose down
~~~

This stops and removes the Compose containers and network. It does not remove the named database volume by default. **Do not use docker compose down -v unless you intentionally want to delete the PostgreSQL data volume.**

---

## Infrastructure automation

### Terraform — local Docker lab

Terraform configuration is located in infrastructure/terraform/docker-lab. It uses the kreuzwerker/docker provider to manage Docker networks and an Nginx test container.

~~~bash
cd infrastructure/terraform/docker-lab

terraform init
terraform fmt -check
terraform validate
terraform plan
~~~

Review the plan before applying:

~~~bash
terraform apply
~~~

Inspect the outputs:

~~~bash
terraform output
~~~

Terraform state files are local and ignored by Git. Protect the state file because it can contain infrastructure details. Run terraform destroy only when you intend to remove the resources managed by this Terraform configuration.

### Ansible — local environment and deployment automation

Ansible configuration, inventory, playbooks, and roles are under infrastructure/ansible.

The setup playbook applies the local environment and Docker setup roles:

~~~bash
cd infrastructure/ansible
ansible-playbook playbooks/setup.yml
~~~

TaskFlow deployment is handled by the taskflow_deploy role and playbook. In the integrated Jenkins flow, the host wrapper validates prerequisites, supplies the image tag, and invokes the playbook. The role:

1. Checks the Compose file, protected environment file, and image override.
2. Confirms the expected current backend replicas are running.
3. Records the previous image for rollback.
4. Validates the updated Compose configuration.
5. Deploys the new image.
6. Checks application and database health.
7. Verifies the backend replica count.
8. Attempts to restore the previous image if deployment verification fails.

Nagios configuration is managed by the nagios_monitoring role:

~~~bash
ansible-playbook playbooks/configure_nagios.yml
~~~

The integrated Jenkins job invokes approved host wrappers rather than granting the Jenkins account unrestricted sudo access.

### Puppet — declarative configuration examples

Puppet manifests and the opspilot_base module are under infrastructure/puppet.

The repository demonstrates declarative management of files, directories, packages, services, system facts, and ERB-generated configuration. For example, the site manifest manages a small Puppet lab directory and marker file; the opspilot_base class manages the tree package, cron service, and a system-information file.

Review manifests before applying them to a machine. The sample manifests use the local account and paths defined in the repository and should be adapted before use on another host.

---

## Kubernetes deployment

Kubernetes manifests are maintained with Kustomize:

- TaskFlow resources: infrastructure/kubernetes/taskflow
- Monitoring resources: infrastructure/kubernetes/monitoring
- Local image deployment script: infrastructure/kubernetes/scripts/deploy-taskflow.sh

### TaskFlow Kubernetes resources

| Resource | Configuration |
|---|---|
| Namespace | opspilot |
| Backend Deployment | 3 baseline replicas |
| Backend Service | ClusterIP, port 5000 |
| PostgreSQL | StatefulSet, 1 replica |
| PostgreSQL storage | 2 GiB PVC, ReadWriteOnce |
| ConfigMap | Non-secret application settings |
| Secret | Database credentials and JWT secret |
| HPA | 3–10 replicas, CPU target 50% |
| PDB | minAvailable: 2 |
| Probes | Startup, readiness, and liveness |

The PostgreSQL PVC is persistent application storage. Do not delete the PVC or its bound PersistentVolume when cleaning up or testing the cluster.

### Prepare the Kubernetes credentials Secret

The taskflow Kustomize resources reference a Secret named taskflow-credentials. Create that Secret before applying the TaskFlow resources.

Use a protected, untracked environment file containing only the keys required by the Secret:

- POSTGRES_USER
- POSTGRES_PASSWORD
- DB_USER
- DB_PASSWORD
- JWT_SECRET

Create the Secret from that protected file:

~~~bash
kubectl create secret generic taskflow-credentials \
  --namespace opspilot \
  --from-env-file=/secure/path/taskflow-k8s-secrets.env
~~~

Do not put secret values in shell history, documentation, Git, screenshots, or CI logs. If the Secret already exists, update it using your approved secret-management process rather than blindly creating a duplicate.

### Validate Kubernetes manifests

~~~bash
kubectl kustomize infrastructure/kubernetes/taskflow
kubectl kustomize infrastructure/kubernetes/monitoring

kubectl apply --dry-run=server -k infrastructure/kubernetes/taskflow
kubectl apply --dry-run=server -k infrastructure/kubernetes/monitoring
~~~

The backend image in the checked-in Deployment manifest is an example/local tag. Before bootstrapping a fresh cluster, set it to an image that exists in that cluster's container runtime. The normal Jenkins pipeline updates the live Deployment to the newly built image through the deployment script; it does not re-apply the full Kustomize base on every build.

### Jenkins image deployment script

The local deployment script:

1. Validates the requested opspilot-taskflow image tag.
2. Confirms the image exists in the Docker daemon.
3. Records the currently deployed image.
4. Imports the image into the Docker Desktop Kubernetes node's containerd image store.
5. Updates the TaskFlow Deployment.
6. Waits for the rolling update.
7. temporarily port-forwards the service and checks application and database health.
8. Verifies the final image.
9. Attempts a Kubernetes rollout undo if deployment verification fails.

The script currently targets the Docker Desktop Kubernetes node container named desktop-control-plane. This is specific to the verified local environment and must be adapted for a different Kubernetes distribution or node topology.

### Inspect Kubernetes resources

~~~bash
kubectl get pods -n opspilot -o wide
kubectl get deployments -n opspilot
kubectl get services -n opspilot
kubectl get pvc -n opspilot
kubectl get hpa -n opspilot
kubectl get pdb -n opspilot
~~~

Access the backend service locally using port forwarding:

~~~bash
kubectl port-forward -n opspilot service/taskflow-backend 5000:5000
~~~

In another terminal:

~~~bash
curl --fail http://127.0.0.1:5000/api/v1/health
curl --fail http://127.0.0.1:5000/api/v1/health/db
~~~

### HPA load-test manifest

A separate sample load-test manifest is stored at infrastructure/kubernetes/taskflow/tests/hpa-load-test.yaml. It is intentionally not included in the main Kustomize resource list. Review it before applying and remove the test workload after the experiment.

---

## Monitoring and observability

### Prometheus

Prometheus runs in the opspilot-monitoring namespace and is configured with a 15-second scrape interval and 7-day time-series retention.

Configured scrape jobs include:

- Prometheus itself.
- kube-state-metrics.
- Blackbox Exporter.
- TaskFlow application health endpoint.
- TaskFlow database health endpoint.

Prometheus and Grafana currently use ephemeral emptyDir storage in the local manifests. Their time-series and dashboard data can be lost when the respective pods are recreated. This does not affect the TaskFlow PostgreSQL PVC.

### Grafana

Grafana is provisioned with:

- A Prometheus datasource.
- An OpsPilot dashboard.
- Kubernetes and TaskFlow health/resource panels.

The admin password is supplied through the Kubernetes Secret grafana-admin. Do not store the password in this README or in Git.

### Blackbox Exporter and kube-state-metrics

- Blackbox Exporter performs HTTP probes for the TaskFlow health endpoints through Prometheus.
- kube-state-metrics exposes Kubernetes object-state metrics used for workload and cluster visibility.

### Nagios Core

The Ansible-managed Nagios configuration defines four service checks:

| Nagios service | Check |
|---|---|
| OpsPilot - Jenkins | HTTP check on Jenkins |
| OpsPilot - TaskFlow API | HTTP check of TaskFlow health endpoint |
| OpsPilot - Nagios Web UI | HTTP check of Nagios web interface |
| OpsPilot - PostgreSQL | TCP port check |

The current local lab uses these access addresses:

| Interface | Local address |
|---|---|
| Jenkins | http://localhost:8080 |
| Nagios Web UI | http://localhost:8082/nagios4/ |
| Prometheus (port-forward) | http://localhost:9090 |
| Grafana (port-forward) | http://localhost:3000 |

Start monitoring port-forwards when needed:

~~~bash
kubectl port-forward -n opspilot-monitoring service/prometheus 9090:9090
~~~

~~~bash
kubectl port-forward -n opspilot-monitoring service/grafana 3000:3000
~~~

Run each command in its own terminal and stop the foreground port-forward with Ctrl+C when finished. The Kubernetes monitoring workloads continue running.

Inspect monitoring pods:

~~~bash
kubectl get pods -n opspilot-monitoring
kubectl get services -n opspilot-monitoring
~~~

---

## Jenkins CI/CD pipeline

The pipeline definition is at the repository root in Jenkinsfile.

### Pipeline stages

| Order | Stage | Responsibility |
|---:|---|---|
| 1 | Validate Repository | Check required source files, tools, Ansible paths, and host wrappers |
| 2 | Install Dependencies | Run npm ci |
| 3 | Production Dependency Security Audit | Run npm audit --omit=dev at moderate severity |
| 4 | Full Dependency Security Audit | Audit all dependencies, archive JSON report, fail on moderate/high/critical findings |
| 5 | JavaScript Syntax Check | Run node --check over source JavaScript files |
| 6 | Automated Tests | Run npm test |
| 7 | Docker Image Build | Build opspilot-taskflow:BUILD_NUMBER |
| 8 | Ansible Deployment | Deploy the image to the Docker Compose environment |
| 9 | Kubernetes Deployment | Import the image and roll out the Kubernetes Deployment |
| 10 | Nagios Configuration Deployment | Validate and deploy the Nagios configuration |
| 11 | Nagios Health Verification | Confirm the four configured services are OK |

### Deployment and rollback behavior

- Jenkins disables concurrent builds and applies a 30-minute pipeline timeout.
- Build artifacts are retained according to the Jenkins build-discarder configuration.
- The Docker image tag is based on the Jenkins build number.
- Ansible records the currently deployed Compose image and attempts rollback if the new deployment fails verification.
- The Kubernetes script records the prior image and attempts rollout undo if the new rollout or health verification fails.
- Jenkins calls restricted host wrappers through sudo. The wrappers and sudoers configuration must be provisioned on the Jenkins host separately.

### Jenkins job configuration

For the verified local setup:

1. Create a Pipeline job in Jenkins.
2. Configure Pipeline script from SCM.
3. Select Git.
4. Set the repository URL to https://github.com/Utkarsh1021/OpsPilot.git.
5. Select the main branch.
6. Set the script path to Jenkinsfile.
7. Ensure Jenkins can access the Docker daemon and the approved deployment wrappers.

A repository checkout alone is not enough to reproduce the integrated pipeline on a fresh machine. The host-level Jenkins service, Docker Desktop integration, Kubernetes context, deployment wrappers, Ansible dependencies, Nagios installation, and restricted sudo permissions must also be configured.

---

## Verification results

The following is a recorded successful run from the local environment, not a promise that every future run will have identical results.

**Verified Jenkins run: Build #20**

| Check | Observed result |
|---|---|
| Jenkins pipeline | SUCCESS |
| Production dependency audit | 0 vulnerabilities |
| Full dependency audit | 0 vulnerabilities |
| Automated tests | 18 passed, 0 failed |
| Docker image | opspilot-taskflow:20 |
| Ansible Compose deployment | Successful; 3 backend replicas |
| Kubernetes rollout | Successful |
| Kubernetes API health | PASS |
| Kubernetes database health | PASS |
| Nagios service checks | 4 of 4 OK |

**Live Kubernetes verification after Build #20**

- PostgreSQL pod: 1/1 Running.
- TaskFlow backend pods: 3/3 Running.
- Backend container restarts: 0 at the time of verification.
- Deployment image: opspilot-taskflow:20.
- HPA: 3 current replicas, 3 minimum, 10 maximum; observed CPU utilization 1% against a 50% target.
- Monitoring: Prometheus, Grafana, Blackbox Exporter, and kube-state-metrics all Running.

These values are a snapshot from the verification run and will change as the environment and build number change.

---

## Useful commands

### Application and Compose

~~~bash
cd apps/backend-node
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 postgres
docker compose logs --tail=100 nginx
~~~

### Jenkins and Docker images

~~~bash
docker image ls opspilot-taskflow
~~~

Check Jenkins at http://localhost:8080.

### Kubernetes

~~~bash
kubectl config current-context
kubectl get nodes
kubectl get pods -n opspilot
kubectl get pods -n opspilot-monitoring
kubectl get hpa -n opspilot
kubectl top pods -n opspilot
kubectl get pvc -n opspilot
~~~

### Ansible

~~~bash
cd infrastructure/ansible
ansible-playbook playbooks/setup.yml --syntax-check
ansible-playbook playbooks/configure_nagios.yml --syntax-check
~~~

### Terraform

~~~bash
cd infrastructure/terraform/docker-lab
terraform fmt -check
terraform validate
terraform plan
~~~

---

## Security and operational notes

- Never commit .env files, passwords, JWT secrets, private keys, kubeconfig files, Terraform state, or generated credentials.
- The repository ignores environment files and Terraform state artifacts. Verify ignore rules before adding new configuration files.
- Keep the TaskFlow .env file permission restricted (0600).
- Use Kubernetes Secrets for sensitive values and ConfigMaps for non-sensitive configuration.
- Jenkins should invoke only the approved deployment wrappers; do not grant unrestricted sudo access to the Jenkins service account.
- Keep Docker and Kubernetes management interfaces bound to trusted local interfaces unless there is a deliberate secured exposure design.
- The Compose PostgreSQL and Nginx host ports are bound to 127.0.0.1 in the checked-in Compose file.
- Do not delete the PostgreSQL Compose volume or Kubernetes PVC when cleaning up test resources.
- Prometheus and Grafana currently use ephemeral storage in the local monitoring manifests.
- The Kubernetes deployment helper is tailored to Docker Desktop's local node container and is not a generic remote-cluster deployment tool.
- Review Terraform plans and Kubernetes manifests before applying changes.

---

## Known limitations and next steps

The project is operational as a local DevOps demonstration. The following are possible future improvements, not features claimed as already implemented:

- Move the Kubernetes image deployment flow to a registry-backed workflow for remote clusters.
- Add a production ingress controller, TLS, and external access configuration.
- Add durable storage and backup/restore procedures for Prometheus and Grafana.
- Add centralized log aggregation.
- Add automated PostgreSQL backup and recovery tests.
- Add a remote cloud Kubernetes deployment target.
- Add CI checks for Terraform, Ansible, Puppet, and Kubernetes manifest validation.
- Add documented screenshots and a recorded project walkthrough.

---

## Author

**Utkarsh**  
B.Tech, Computer Science and Engineering

**Project:** OpsPilot — Local DevOps Automation, CI/CD, Kubernetes, and Monitoring Lab

---

*OpsPilot — Automate infrastructure. Deliver reliably. Observe continuously.*
