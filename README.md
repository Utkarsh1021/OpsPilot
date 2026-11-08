# OpsPilot 🚀
### Automated Infrastructure Provisioning, Configuration Management, CI/CD & Monitoring Platform

**OpsPilot** is an end-to-end DevOps automation platform designed to demonstrate how modern software applications can be provisioned, configured, deployed, monitored, and maintained through industry-standard DevOps tools and practices.

The project follows a **hybrid, zero-cost deployment architecture**, combining a local DevOps infrastructure lab with a publicly accessible application deployment.

The objective is to build a reproducible environment that demonstrates Infrastructure as Code (IaC), configuration management, containerization, CI/CD automation, monitoring, and container orchestration.

---

## 📌 Project Objectives

- Automate infrastructure provisioning using Terraform.
- Implement configuration management using Ansible and Puppet.
- Build automated CI/CD pipelines using Jenkins.
- Containerize applications using Docker and Docker Compose.
- Configure reverse proxy and load balancing using Nginx.
- Monitor infrastructure and application health using Nagios.
- Explore advanced monitoring using Prometheus and Grafana.
- Implement container orchestration using Kubernetes.
- Deploy a publicly accessible application using Cloudflare's free services.
- Maintain a reproducible, version-controlled DevOps environment.

---

## 🏗️ Architecture Overview

OpsPilot follows a hybrid architecture with two major components:

### 1. Local DevOps Infrastructure Lab

The local environment runs on Windows 11 using WSL2, Ubuntu, and Docker Desktop.

It hosts the DevOps toolchain responsible for infrastructure provisioning, configuration management, CI/CD, monitoring, and orchestration.

### 2. Public Application Deployment

The application is deployed using Cloudflare's free-tier services to provide public accessibility without requiring a paid VPS or custom domain.

### High-Level Architecture

```text
                     DEVELOPER
                         |
                         v
                  GitHub Repository
                         |
              +----------+----------+
              |                     |
              v                     v
       Local DevOps Lab       Public Deployment
              |                     |
          Jenkins CI/CD        Cloudflare Pages
              |                     |
          Ansible                 React UI
              |                     |
          Terraform           Cloudflare Workers
              |                     |
       Docker Infrastructure       Hono API
              |                     |
          Puppet                 Cloudflare D1
              |
        Docker Compose
              |
       +------+-------+
       |              |
    Frontend       Backend
       |              |
       +------+-------+
              |
         PostgreSQL
              |
          Nginx
              |
       Nagios Monitoring
              |
       Prometheus/Grafana
              |
       Kubernetes (Kind)
```

*Note: The diagram represents the planned architecture. Individual components will be integrated progressively. Local PostgreSQL and Cloudflare D1 are separate database environments.*

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Infrastructure as Code | Terraform |
| Configuration Management | Ansible, Puppet |
| CI/CD | Jenkins, GitHub |
| Containerization | Docker, Docker Compose |
| Reverse Proxy / Load Balancing | Nginx |
| Monitoring | Nagios Core |
| Advanced Monitoring | Prometheus, Grafana |
| Container Orchestration | Kubernetes, Kind |
| Frontend | React, Vite, TypeScript |
| Local Backend | Node.js, Express.js |
| Public Backend | Cloudflare Workers, Hono |
| Local Database | PostgreSQL |
| Public Database | Cloudflare D1 |
| Development Environment | Windows 11, WSL2, Ubuntu |
| Public Hosting | Cloudflare Pages, Workers |

---

## 📂 Project Structure

```text
OpsPilot/
│
├── apps/
│   ├── frontend/              # React + Vite frontend
│   ├── backend-node/          # Node.js + Express local backend
│   └── backend-worker/        # Cloudflare Workers public API
│
├── infrastructure/
│   ├── docker/                # Dockerfiles and Compose files
│   └── terraform/              # Terraform configurations
│
├── configuration/
│   ├── ansible/               # Ansible inventories, playbooks and roles
│   └── puppet/                # Puppet manifests and modules
│
├── ci-cd/
│   └── Jenkinsfile            # Jenkins pipeline definition
│
├── monitoring/
│   ├── nagios/                # Nagios host and service configurations
│   ├── prometheus/            # Prometheus configuration
│   └── grafana/               # Grafana dashboards
│
├── orchestration/
│   └── kubernetes/            # Kubernetes manifests and configurations
│
├── database/
│   ├── postgres/              # PostgreSQL initialization and migrations
│   └── d1/                    # Cloudflare D1 migrations
│
├── nginx/                     # Reverse proxy and load-balancing config
│
├── docs/
│   ├── architecture.md
│   ├── installation.md
│   ├── deployment.md
│   ├── troubleshooting.md
│   └── screenshots/
│
├── .gitignore
├── README.md
└── LICENSE
```

*The directory structure will be created incrementally as each project phase is implemented.*

---

## ⚙️ Core DevOps Components

### 1. Terraform – Infrastructure as Code

Terraform manages the lifecycle of local infrastructure resources using the Docker provider.

Planned capabilities:
- Provision Docker containers, networks, and volumes.
- Define reusable Terraform configurations and modules.
- Maintain Terraform state.
- Demonstrate infrastructure updates and resource destruction.
- Explore workspaces and dependency management.

### 2. Ansible – Configuration Management & Automation

Ansible automates application deployment and infrastructure configuration.

Planned capabilities:
- Configure target machines through SSH.
- Create inventories and reusable playbooks.
- Automate application deployment.
- Manage packages, services, and configuration files.
- Implement reusable roles and task handlers.

### 3. Puppet – Desired-State Configuration Management

Puppet maintains the desired configuration state of managed systems.

Planned capabilities:
- Configure Puppet Server and Agent.
- Write declarative manifests.
- Create reusable Puppet modules.
- Manage packages, services, and files.
- Demonstrate automated configuration enforcement.

### 4. Jenkins – Continuous Integration & Continuous Deployment

Jenkins automates the application build, testing, and deployment workflow.

Planned pipeline:

```text
Developer Push
      |
      v
GitHub Repository
      |
      v
Jenkins Pipeline
      |
      v
Source Checkout
      |
      v
Build & Test
      |
      v
Docker Image Build
      |
      v
Deployment Automation
      |
      v
Application Health Check
```

### 5. Nagios – Infrastructure Monitoring

Nagios Core monitors the health and availability of infrastructure and application services.

Planned capabilities:
- Host availability monitoring.
- HTTP and application endpoint checks.
- CPU, memory, and disk monitoring.
- Service availability checks.
- Warning and critical alerts.
- Event handling and recovery integration.

### 6. Docker & Docker Compose – Containerization

Docker provides isolated and reproducible application environments.

Planned capabilities:
- Build custom Docker images.
- Containerize frontend and backend services.
- Configure persistent database volumes.
- Create custom Docker networks.
- Run multiple backend instances.
- Manage services through Docker Compose.

### 7. Nginx – Reverse Proxy & Load Balancing

Nginx manages incoming application traffic.

Planned capabilities:
- Reverse proxy configuration.
- Load balancing across backend instances.
- Request routing.
- Centralized entry point for application services.

### 8. Kubernetes – Container Orchestration

Kind (Kubernetes in Docker) will be used to explore Kubernetes locally.

Planned capabilities:
- Deployments and ReplicaSets.
- Services and ConfigMaps.
- Secrets and persistent storage.
- Liveness and readiness probes.
- Horizontal Pod Autoscaling.
- Rolling updates and rollback.

### 9. Prometheus & Grafana – Advanced Monitoring

These tools will extend the monitoring capabilities of the project.

- Prometheus for metrics collection and querying.
- Grafana for visualization and dashboards.
- Application and infrastructure metrics.
- Monitoring of container resource utilization.

---

## 🌐 Deployment Strategy

OpsPilot uses a hybrid deployment approach.

| Component | Deployment Environment |
|---|---|
| Terraform | Local WSL2 environment |
| Ansible | Local WSL2 environment |
| Puppet | Local Docker/WSL2 environment |
| Jenkins | Local Docker environment |
| Nagios | Local Docker environment |
| PostgreSQL | Local Docker environment |
| Kubernetes | Local Kind cluster |
| Frontend | Cloudflare Pages |
| Public API | Cloudflare Workers |
| Public Database | Cloudflare D1 |
| Source Code | GitHub |

**Cost strategy:** The project targets free-tier services and locally hosted infrastructure. No paid cloud VM, custom domain, or subscription is required. Actual usage remains subject to the providers' free-tier limits and applicable terms.

---

## 🚀 Implementation Roadmap

| Phase | Implementation | Status |
|---|---|---|
| 1 | Environment setup and application development | Planned |
| 2 | Docker and Docker Compose integration | Planned |
| 3 | Terraform infrastructure provisioning | Planned |
| 4 | Ansible automation | Planned |
| 5 | Puppet configuration management | Planned |
| 6 | Nagios monitoring | Planned |
| 7 | Jenkins CI/CD pipeline | Planned |
| 8 | Cloudflare public deployment | Planned |
| 9 | Kubernetes orchestration using Kind | Planned |
| 10 | Prometheus, Grafana and advanced monitoring | Planned |
| 11 | Documentation, testing and final demonstration | Planned |

---

## 💻 Prerequisites

The development environment is designed around:

- Windows 11
- WSL2
- Ubuntu 24.04 LTS
- Docker Desktop
- Docker Compose
- Git
- Node.js and npm
- Terraform
- Ansible
- Puppet
- Jenkins
- Nagios Core
- Cloudflare account
- GitHub account

Some tools will run inside Docker containers rather than being installed directly on the host machine.

**Recommended hardware:**
- 16 GB RAM or more.
- Multi-core processor.
- At least 30–40 GB of available disk space for the complete local toolchain.

---

## 🔧 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/OpsPilot.git

cd OpsPilot
```

### 2. Start the Development Environment

Start Docker Desktop and ensure that its Linux engine is running.

Verify Docker:

```bash
docker version
docker compose version
```

### 3. Install Project Dependencies

Once the application directories are implemented:

```bash
cd apps/frontend
npm install
```

Install backend dependencies:

```bash
cd ../backend-node
npm install
```

### 4. Start the Application

After the Docker Compose configuration is implemented:

```bash
docker compose up -d --build
```

Check running containers:

```bash
docker ps
```

*The commands above describe the intended workflow. They will become executable once the corresponding application files and Compose configuration are added.*

---

## 🔐 Security Considerations

Security is an important part of the OpsPilot implementation.

- Keep credentials and API keys in environment variables.
- Never commit `.env` files or private keys.
- Use least-privilege access for automation tools.
- Restrict access to Jenkins, Puppet Server, Nagios, and database administration interfaces.
- Avoid exposing internal management ports publicly.
- Use HTTPS for public application endpoints.
- Apply authentication and authorization to protected API endpoints.
- Keep Docker images and dependencies updated.
- Use Cloudflare's public services only for intended application traffic.

---

## 📊 Expected Outcomes

Upon completion, OpsPilot aims to demonstrate:

1. Automated infrastructure provisioning through Terraform.
2. Configuration management through Ansible and Puppet.
3. Automated CI/CD using Jenkins.
4. Containerized application deployment with Docker.
5. Reverse proxy and load balancing using Nginx.
6. Infrastructure and service monitoring using Nagios.
7. Container orchestration using Kubernetes.
8. Advanced metrics visualization through Prometheus and Grafana.
9. Public application delivery through Cloudflare.
10. A reproducible, documented DevOps workflow.

---

## 📚 Learning Outcomes

This project provides practical exposure to:

- Infrastructure as Code (IaC).
- Configuration Management.
- Continuous Integration and Continuous Deployment.
- Containerization and orchestration.
- Infrastructure monitoring and alerting.
- Reverse proxy and load balancing.
- Linux administration and networking.
- Cloud deployment and automation.
- DevOps security and operational practices.

---

## 👨‍💻 Author

**Utkarsh Raj**

B.Tech – Computer Science and Engineering

**Project:** OpsPilot – Automated Infrastructure Provisioning, Configuration Management, CI/CD & Monitoring Platform

---

## 📄 License

This project is intended for academic, educational, and practical learning purposes.

The licensing terms will be defined in the repository's `LICENSE` file.

---

*OpsPilot — Automating Infrastructure. Simplifying Deployment. Improving Reliability.*