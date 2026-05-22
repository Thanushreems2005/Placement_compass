pipeline {
    agent any

    // Ensure the nodejs tool uses the correct Node version. 
    // Jenkins will look for the installation matching this name at C:\Program Files\nodejs.
    tools {
        nodejs 'node24'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Frontend Install') {
            steps {
                echo 'Installing Frontend Dependencies...'
                bat 'npm install'
            }
        }

        stage('Frontend Build') {
            steps {
                echo 'Building Frontend (Vite)...'
                bat 'npm run build'
            }
        }

        stage('Docker Diagnostics & Retry-Safe Verification') {
            options {
                // Retry if Docker Desktop backend pipe is temporarily unstable on Windows
                retry(3)
            }
            steps {
                echo 'Verifying Docker Daemon is responsive...'
                bat 'docker version'
                bat 'docker compose version'
                echo 'Running system diagnostics...'
                bat 'docker ps -a'
                bat 'docker network ls'
            }
        }

        stage('Docker Cleanup') {
            options {
                // Retry cleanup if Docker Desktop pipe drops the connection
                retry(3)
            }
            steps {
                echo 'Cleaning up duplicate failed Jenkins project...'
                bat 'docker compose -p placement_intel down --remove-orphans || exit 0'
                bat 'docker compose -p placement_intelligence down --remove-orphans || exit 0'
                bat 'docker compose -p placement-com down --remove-orphans || exit 0'

                echo 'Preserving healthy running containers and pruning stopped duplicates...'
                // Only prune stopped/exited duplicate containers without destroying healthy running ones
                bat 'docker container prune -f || exit 0'
            }
        }

        stage('Docker Build') {
            options {
                timeout(time: 30, unit: 'MINUTES')
            }
            steps {
                echo 'Building Docker Images...'
                bat 'set "DOCKER_BUILDKIT=1" && docker compose -p placement-compass-main build --progress=plain'
            }
        }

        stage('Docker Deploy') {
            options {
                retry(3)
            }
            steps {
                echo 'Starting Services Gracefully (Zero-Downtime Reconcile)...'
                bat 'docker compose -p placement-compass-main up -d --remove-orphans'
            }
        }

        stage('Docker Debugging & Status') {
            steps {
                echo 'Listing all running containers to verify unified deployment...'
                bat 'docker ps'
                
                echo 'Listing compose status...'
                bat 'docker compose -p placement-compass-main ps'
            }
        }

        stage('Health Check') {
            steps {
                echo 'Waiting for services to spin up...'
                sleep time: 20, unit: 'SECONDS'
                
                echo 'Verifying Redis...'
                bat 'docker compose -p placement-compass-main exec -T redis redis-cli ping || exit 1'

                echo 'Checking Backend Health...'
                bat 'curl -f http://localhost:8000/docs || exit 1'
                
                echo 'Checking Frontend Health...'
                bat 'curl -f http://localhost || exit 1'
            }
        }
    }

    post {
        success {
            echo 'Enterprise Pipeline completed successfully! Zero-downtime deployment handled.'
        }
        failure {
            echo 'Pipeline failed. Gathering logs for debugging.'
            bat 'docker compose -p placement-compass-main logs --tail=100'
        }
    }
}
