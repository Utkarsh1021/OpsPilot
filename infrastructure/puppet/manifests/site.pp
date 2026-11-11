file { '/home/utkarsh/opspilot-puppet-lab':
  ensure => directory,
  owner  => 'utkarsh',
  group  => 'utkarsh',
  mode   => '0755',
}

file { '/home/utkarsh/opspilot-puppet-lab/managed-by-puppet.txt':
  ensure  => file,
  owner   => 'utkarsh',
  group   => 'utkarsh',
  mode    => '0644',
  content => "Project: OpsPilot\nManaged by: Puppet\nPurpose: Standalone configuration management lab\n",
  require => File['/home/utkarsh/opspilot-puppet-lab'],
}