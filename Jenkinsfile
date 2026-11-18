
pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(
            numToKeepStr: '20',
            artifactNumToKeepStr: '10'
        ))
        timestamps()
    }

    environment {
        IMAGE_NAME = 'opspilot-taskflow'
    }

    stages {

        stage('Validate Repository') {
            steps {
                echo 'Validating project structure and deployment prerequisites...'

                sh '''

                    set -eu
                    test -f apps/backend-node/package.json
                    test -f apps/backend-node/package-lock.json
                    test -f apps/backend-node/Dockerfile
                    test -d infrastructure/terraform
                    test -d infrastructure/ansible
                    test -d infrastructure/puppet

                    test -f infrastructure/ansible/playbooks/configure_nagios.yml
                    test -f infrastructure/ansible/roles/nagios_monitoring/tasks/main.yml
                    test -f infrastructure/ansible/roles/nagios_monitoring/templates/opspilot.cfg.j2


                    # Required CLI tools
                    command -v git
                    command -v node
                    command -v npm
                    command -v docker
                    command -v ansible-playbook
                    command -v sudo

                    # Deployment wrappers
                    test -x /usr/local/lib/opspilot/deploy-taskflow
                    test -x /usr/local/lib/opspilot/configure-nagios
                    test -x /usr/local/lib/opspilot/check-nagios-health

                    echo "Repository and deployment prerequisites validation passed."

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
        stage('Production Dependency Security Audit') {
            steps {
                dir('apps/backend-node') {
                    echo 'Auditing production dependencies...'
                    sh 'npm audit --omit=dev --audit-level=moderate'
                }
            }
        }
        stage('Full Dependency Security Audit') {
            steps {
                dir('apps/backend-node') {
                    script {
                        echo 'Auditing all dependencies, including development dependencies...'
                        int auditStatus = sh(
                            returnStatus: true,
                            script: 'npm audit --audit-level=moderate --json > npm-audit-full.json'
                        )

                        archiveArtifacts(
                            artifacts: 'npm-audit-full.json',
                            fingerprint: true
                        )
                        int reportStatus = sh(
                            returnStatus: true,
                            script: '''
                                node -e '
                                    const fs = require("fs");

                                    try {
                                        const report = JSON.parse(
                                            fs.readFileSync("npm-audit-full.json", "utf8")
                                        );

                                        if (report.error) {
                                            console.error("AUDIT_ERROR:", report.error);
                                            process.exit(2);
                                        }

                                        if (!report.metadata ||
                                            !report.metadata.vulnerabilities) {
                                                console.error("Invalid npm audit report structure.");
                                                process.exit(2);
                                            }

                                        const counts = report.metadata.vulnerabilities;

                                        console.log("Vulnerability summary:", counts);

                                        if (counts.moderate > 0 ||
                                            counts.high > 0 ||
                                            counts.critical > 0
                                        ) {
                                            process.exit(1);
                                        }
                                        process.exit(0);
                                    } catch (error) {
                                        console.error("Unable to parse npm audit report:", error.message);
                                        process.exit(2);
                                    }
                                '
                            '''
                        )
                        if (reportStatus == 2) {
                            error('Dependency audit failed or returned an invalid report.')
                        } else if (reportStatus == 1) {
                            if (auditStatus == 0) {
                                error('Unexpected audit status: report contains vulnerabilities but npm returned success.')
                            }

                            unstable(
                                'Development dependency vulnerabilities detected. Review the archived npm audit report.'
                            )

                            echo 'WARNING: Full dependency audit found vulnerabilities.'
                        } else if (auditStatus != 0) {
                            error('npm audit exited unsuccessfully without reporting vulnerabilities.')
                        } else {
                            echo 'Full dependency audit passed at the configured moderate severity threshold.'
                        }
                    }
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
        unstable {
            echo 'Pipeline completed with warnings. Review dependency security findings.'
        }
    }
}
