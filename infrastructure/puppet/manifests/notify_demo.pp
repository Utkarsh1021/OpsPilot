file { '/home/utkarsh/opspilot-puppet-lab/notify-demo.conf':
  ensure  => file,
  owner   => 'utkarsh',
  group   => 'utkarsh',
  mode    => '0644',
  content => "PROJECT=OpsPilot\nVERSION=1.0\n",
}

service { 'cron':
  ensure    => running,
  enable    => true,
  subscribe => File['/home/utkarsh/opspilot-puppet-lab/notify-demo.conf'],
}