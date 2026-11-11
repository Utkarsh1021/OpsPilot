variable "network_name" {
  description = "Name of the Docker network"
  type        = string
  default     = "opspilot-network"
}

variable "network_driver" {
  description = "Docker network driver"
  type        = string
  default     = "bridge"
}

variable "network_attachable" {
  description = "Allow standalone containers to attach to this network"
  type        = bool
  default     = true
}