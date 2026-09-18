pipeline {
    agent any

    environment {
        // Registry Configuration (configured as in your office pipeline)
        REGISTRY_CREDENTIAL_ID = 'citybankHarbor'
        REGISTRY_URL = 'https://f1hub-uat.citybankplc.com/'
        IMAGE_NAME = 'f1hub-uat.citybankplc.com/f1-project/' + "${env.JOB_NAME}"
        DOCKER_FILE = 'Dockerfile'
        JEN_HOME = '/root/jenkins/jenkins_home/workspace/$JOB_NAME'
        TARGET_URL = "${BUILD_URL}" + 'execution/node/3/ws/'
        NAMESPACE = 'default'
        REPO_DIR = 'citybank/citybank_manifest'
        BRANCH = 'prod'
    }

    parameters {
        booleanParam(name: 'autoDeployArgo', defaultValue: false, description: 'Auto Deployment by Argocd')
        booleanParam(name: 'executeTrivyScan', defaultValue: false, description: 'Execute Trivy scan')
    }

    options {
        skipDefaultCheckout(true)  // Skip default checkout to prevent 'checkout scm' error
    }

    stages {
        stage("Clean Workspace") {
            steps {
                deleteDir()  // Clean the workspace
            }
        }

        stage("Git Checkout") {
            steps {
                checkout([$class: 'GitSCM', 
                    branches: [[name: "main"]],  
                    userRemoteConfigs: [[
                        url: 'https://gitlab-01.f1soft.com/code-library/pgw-client-test.git', 
                        credentialsId: 'BankxpDevops'
                    ]]  
                ])
            }
        }

        stage("Build") {
            steps {
                script {
                    sh 'npm install --omit=dev'
                }
            }
        }

        stage('Build Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -f ${DOCKER_FILE} ${WORKSPACE}"
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${REGISTRY_CREDENTIAL_ID}", 
                    passwordVariable: 'DOCKER_REGISTRY_PASSWORD', 
                    usernameVariable: 'DOCKER_REGISTRY_USERNAME'
                )]) {
                    sh "echo ${DOCKER_REGISTRY_PASSWORD} | docker login -u ${DOCKER_REGISTRY_USERNAME} --password-stdin ${REGISTRY_URL}"
                }
                sh "docker push ${IMAGE_NAME}:${BUILD_NUMBER}"
            }
        }

        stage('Print Image for Rancher') {
            steps {
                script {
                    echo "════════════════════════════════════════════════════════════"
                    echo "  BUILD SUCCESSFUL!"
                    echo "  USE THIS IMAGE IN RANCHER:"
                    echo "  ${IMAGE_NAME}:${BUILD_NUMBER}"
                    echo "════════════════════════════════════════════════════════════"

                    writeFile file: 'image-id.txt', text: """\
IMAGE=${IMAGE_NAME}:${BUILD_NUMBER}
BUILD_NUMBER=${BUILD_NUMBER}
"""
                }
            }
        }
    }

    post {
        success {
            sh 'docker rmi ${IMAGE_NAME}:${BUILD_NUMBER} || true'

            archiveArtifacts artifacts: 'image-id.txt',
                onlyIfSuccessful: true,
                fingerprint: true
        }

        failure {
            echo 'The build has failed.'
        }
    }
}