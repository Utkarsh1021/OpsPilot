# 1. Define variables
$project_name = 'OpsPilot'
$deployment_environment  = 'development'
$deployment_dir = '/home/utkarsh/opspilot-puppet-lab'

# 2. Read system facts
$os_name     = $facts['os']['name']
$os_family   = $facts['os']['family']
$os_version  = $facts['os']['release']['full']
$hostname    = $facts['networking']['hostname']
$kernel_name = $facts['kernel']

# 3. Display system information
notify { 'opspilot_system_information':
  message => "Project: ${project_name}, Host: ${hostname}, OS: ${os_name} ${os_version}, Kernel: ${kernel_name}",
}

# 4. Conditional configuration
if $os_family == 'Debian' {
  $package_manager = 'apt'
} else {
  $package_manager = 'unsupported'
}

# 5. Generate dynamic configuration file
file { "${deployment_dir}/system-info.conf":
  ensure  => file,
  owner   => 'utkarsh',
  group   => 'utkarsh',
  mode    => '0644',
  content => "PROJECT=${project_name}\nENVIRONMENT=${deployment_environment}\nOS_NAME=${os_name}\nOS_FAMILY=${os_family}\nOS_VERSION=${os_version}\nHOSTNAME=${hostname}\nKERNEL=${kernel_name}\nPACKAGE_MANAGER=${package_manager}\n",
}