output "network_name" {
  description = "Name of the created Docker network"
  value       = docker_network.opspilot_network.name
}

output "network_id" {
  description = "ID of the created Docker network"
  value       = docker_network.opspilot_network.id
}

output "network_driver" {
  description = "Driver used by the Docker network"
  value       = docker_network.opspilot_network.driver
}

output "network_subnet" {
  description = "Subnet allocated to the Docker network"
  value       = one(docker_network.opspilot_network.ipam_config).subnet
}

output "dev_network_name" {
  description = "Development Docker network name"
  value       = docker_network.opspilot_dev_network.name
}

output "dev_network_id" {
  description = "Development Docker network ID"
  value       = docker_network.opspilot_dev_network.id
}

output "dev_network_driver" {
  description = "Development Docker network driver"
  value       = docker_network.opspilot_dev_network.driver
}

output "dev_network_subnet" {
  description = "Development Docker network subnet"
  value       = one(docker_network.opspilot_dev_network.ipam_config).subnet
}