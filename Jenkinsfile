
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
