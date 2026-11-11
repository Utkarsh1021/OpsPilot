# 1. Package resource
package { 'tree':
  ensure => installed,
}

# 2. Service resource
service { 'cron':
  ensure => running,
  enable => true,
}

# 3. File resource
file { '/home/utkarsh/opspilot-puppet-lab/opspilot.conf':
  ensure  => file,
  owner   => 'utkarsh',
  group   => 'utkarsh',
  mode    => '0644',
  content => "PROJECT=OpsPilot\nMANAGED_BY=Puppet\nENVIRONMENT=development\n",
}