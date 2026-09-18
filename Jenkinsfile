pipeline {
    agent any

    environment {
        // ── Harbor registry (matches your office format) ──────────────────────
        HARBOR_REGISTRY = 'harbor-citybank.f1soft.com.np'
        HARBOR_PROJECT  = 'bankxp'                           // same project as edge-payment-gateway
        IMAGE_NAME      = 'merchant-payment-tester'
        // ─────────────────────────────────────────────────────────────────────

        // Full image reference: harbor.f1soft.com/merchant/merchant-payment-tester
        IMAGE_FULL      = "${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${IMAGE_NAME}"
        IMAGE_TAG       = "${BUILD_NUMBER}"                  // e.g. :42
        IMAGE_LATEST    = "${IMAGE_FULL}:latest"
        IMAGE_VERSIONED = "${IMAGE_FULL}:${IMAGE_TAG}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    echo "Building image: ${IMAGE_VERSIONED}"
                    sh "docker build -t ${IMAGE_VERSIONED} -t ${IMAGE_LATEST} ."
                }
            }
        }

        stage('Push to Harbor') {
            steps {
                // 'harbor-credentials' must be added in Jenkins:
                //   Manage Jenkins → Credentials → (global) → Add
                //   Kind: Username with password
                //   ID: harbor-credentials
                withCredentials([usernamePassword(
                    credentialsId: 'harbor-credentials',
                    usernameVariable: 'HARBOR_USER',
                    passwordVariable: 'HARBOR_PASS'
                )]) {
                    sh """
                        echo \$HARBOR_PASS | docker login ${HARBOR_REGISTRY} -u \$HARBOR_USER --password-stdin
                        docker push ${IMAGE_VERSIONED}
                        docker push ${IMAGE_LATEST}
                        docker logout ${HARBOR_REGISTRY}
                    """
                }
            }
        }

        stage('Print Image ID') {
            steps {
                script {
                    def imageId = sh(
                        script: "docker inspect --format='{{.Id}}' ${IMAGE_VERSIONED}",
                        returnStdout: true
                    ).trim()

                    echo "════════════════════════════════════════════"
                    echo "  IMAGE TAG   : ${IMAGE_VERSIONED}"
                    echo "  IMAGE ID    : ${imageId}"
                    echo "  Use on Rancher → Workloads → Image field:"
                    echo "  ${IMAGE_VERSIONED}"
                    echo "════════════════════════════════════════════"

                    // Write to a file so it's easy to copy from Jenkins artifacts
                    writeFile file: 'image-id.txt', text: """\
IMAGE_TAG=${IMAGE_VERSIONED}
IMAGE_LATEST=${IMAGE_LATEST}
IMAGE_ID=${imageId}
BUILD_NUMBER=${BUILD_NUMBER}
"""
                }
            }
        }

        stage('Cleanup Local Image') {
            steps {
                sh """
                    docker rmi ${IMAGE_VERSIONED} || true
                    docker rmi ${IMAGE_LATEST}    || true
                """
            }
        }
    }

    post {
        success {
            archiveArtifacts artifacts: 'image-id.txt', fingerprint: true
            echo "✅ Build ${BUILD_NUMBER} pushed successfully."
            echo "Use image on Rancher: ${IMAGE_VERSIONED}"
        }
        failure {
            echo "❌ Build failed. Check console output above."
        }
    }
}

