file { '/home/utkarsh/opspilot-puppet-lab/relationship-demo':
  ensure => directory,
  owner  => 'utkarsh',
  group  => 'utkarsh',
  mode   => '0755',
}

file { '/home/utkarsh/opspilot-puppet-lab/relationship-demo/app.conf':
  ensure  => file,
  owner   => 'utkarsh',
  group   => 'utkarsh',
  mode    => '0644',
  content => "APP=OpsPilot\nMANAGED_BY=Puppet\n",
  require => File['/home/utkarsh/opspilot-puppet-lab/relationship-demo'],
}