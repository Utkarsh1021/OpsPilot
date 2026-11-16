
pipeline {
    agent any

    environment {
        IMAGE_NAME = 'opspilot-taskflow'
    }

    stages {

        stage('Validate Repository') {
            steps {
                echo 'Validating project structure...'

                sh '''
                    test -f apps/backend-node/package.json
                    test -f apps/backend-node/package-lock.json
                    test -f apps/backend-node/Dockerfile
                    test -d infrastructure/terraform
                    test -d infrastructure/ansible
                    test -d infrastructure/puppet

                    test -f infrastructure/ansible/playbooks/configure_nagios.yml
                    test -f infrastructure/ansible/roles/nagios_monitoring/tasks/main.yml
                    test -f infrastructure/ansible/roles/nagios_monitoring/templates/opspilot.cfg.j2

                    echo "Repository structure validation passed."
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('apps/backend-node') {
                    sh 'npm ci'
                }
            }
        }

        stage('Dependency Security Audit') {
            steps {
                dir('apps/backend-node') {
                    sh 'npm audit --audit-level=moderate'
                }
            }
        }

        stage('JavaScript Syntax Check') {
            steps {
                dir('apps/backend-node') {
                    sh '''
                        find src -type f -name "*.js" -print0 |
                        xargs -0 -r -n1 node --check
                    '''

                    echo 'JavaScript syntax validation passed.'
                }
            }
        }
        stage('Automated Tests') {
            steps {
                dir('apps/backend-node') {
                    sh 'npm test'
                }
            }
        }
        stage('Docker Image Build') {
            steps {
                dir('apps/backend-node') {
                    sh '''
                        docker build \
                            -t ${IMAGE_NAME}:${BUILD_NUMBER} \
                            .
                    '''
                }
            }
        }
        stage('Ansible Deployment') {
            steps {
                echo 'Deploying TaskFlow using Ansible...'

                sh '''
                    sudo -n -u utkarsh \
                        /usr/local/lib/opspilot/deploy-taskflow \
                        ${IMAGE_NAME}:${BUILD_NUMBER}
                '''
            }
        }

        stage('Nagios Configuration Deployment') {
            steps {
                echo 'Validating and deploying Nagios configuration using Ansible...'

                sh '''
                    sudo -n /usr/local/lib/opspilot/configure-nagios
                '''
            }
        }
        stage('Nagios Health Verification') {
            steps {
                echo 'Verifying live Nagios service states...'
                sh '''
                    sudo -n /usr/local/lib/opspilot/check-nagios-health
                '''
            }
        }
    }
    post {
        success {
            echo 'OpsPilot CI pipeline completed successfully!'
        }

        failure {
            echo 'OpsPilot CI pipeline failed. Check the failed stage.'
        }

        always {
            echo 'OpsPilot pipeline execution finished.'
        }
    }
}
