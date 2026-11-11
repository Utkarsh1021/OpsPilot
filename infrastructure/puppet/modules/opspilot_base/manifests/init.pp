class opspilot_base (
  String $project_name = 'OpsPilot',
  String $deployment_environment = 'development',
) {

  # Collect system facts
  $hostname        = $facts['networking']['hostname']
  $os_name         = $facts['os']['name']
  $os_family       = $facts['os']['family']
  $os_version      = $facts['os']['release']['full']
  $kernel_name     = $facts['kernel']

  # Determine package manager
  if $os_family == 'Debian' {
    $package_manager = 'apt'
  } else {
    $package_manager = 'unsupported'
  }

  # Manage package
  package { 'tree':
    ensure => installed,
  }

  # Manage service
  service { 'cron':
    ensure => running,
    enable => true,
  }

  # Generate configuration using ERB template
  file { '/home/utkarsh/opspilot-puppet-lab/module-info.conf':
    ensure  => file,
    owner   => 'utkarsh',
    group   => 'utkarsh',
    mode    => '0644',
    content => template('opspilot_base/system-info.conf.erb'),
  }
}