
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 4.2.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# Shared network - only managed in default workspace
resource "docker_network" "opspilot_network" {
  name       = "opspilot-network"
  driver     = "bridge"
  attachable = true
}

# Development network - managed separately per workspace
resource "docker_network" "opspilot_dev_network" {
  name = terraform.workspace == "default" ? var.network_name : "opspilot-${terraform.workspace}-network"

  driver     = var.network_driver
  attachable = var.network_attachable
}

# Pull the Nginx Docker image
resource "docker_image" "nginx" {
  name         = "nginx:alpine"
  keep_locally = true
}


# Create the Nginx test container
resource "docker_container" "nginx" {
  name  = "opspilot-test-nginx"
  image = docker_image.nginx.image_id

  ports {
    internal = 80
    external = 8081
  }

  networks_advanced {
    name = docker_network.opspilot_dev_network.name
  }

  restart = "unless-stopped"
}
