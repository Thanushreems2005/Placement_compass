pipeline {
    agent any

    tools {
        nodejs 'node20'
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

        stage('Docker Verification') {
            steps {
                echo 'Verifying Docker Daemon is running...'
                bat 'docker version'
                bat 'docker compose version'
            }
        }

        stage('Docker Cleanup') {
            steps {
                echo 'Cleaning up old containers safely...'
                // Use explicit project name and --remove-orphans to clean up old stacks
                bat 'docker compose -p placement-com down --remove-orphans || exit 0'
            }
        }

        stage('Docker Build') {
            options {
                // Prevent Jenkins from failing long pip installs prematurely
                timeout(time: 30, unit: 'MINUTES')
            }
            steps {
                echo 'Building Docker Images...'
                // --progress=plain ensures we see pip install logs in real-time
                // DOCKER_BUILDKIT=1 enables advanced layer caching
                bat 'set "DOCKER_BUILDKIT=1" && docker compose -p placement-com build --progress=plain'
            }
        }

        stage('Docker Deploy') {
            steps {
                echo 'Starting Services...'
                bat 'docker compose -p placement-com up -d --remove-orphans'
            }
        }

        stage('Health Check') {
            steps {
                echo 'Waiting for services to spin up...'
                // Give the containers extra time to boot and start serving before we check them
                sleep time: 20, unit: 'SECONDS'
                
                echo 'Verifying Redis...'
                // Get the container ID/name dynamically or use compose exec
                bat 'docker compose -p placement-com exec -T redis redis-cli ping || exit 1'

                echo 'Checking Backend Health...'
                bat 'curl -f http://localhost:8000/docs || exit 1'
                
                echo 'Checking Frontend Health...'
                bat 'curl -f http://localhost || exit 1'
            }
        }
    }

    post {
        success {
            echo 'Enterprise Pipeline completed successfully! All services deployed and verified healthy.'
        }
        failure {
            echo 'Pipeline failed. Please check the logs in Jenkins.'
            bat 'docker compose -p placement-com logs --tail=100'
        }
    }
}
