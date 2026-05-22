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
            }
        }

        stage('Docker Cleanup') {
            steps {
                echo 'Cleaning up old containers safely...'
                // The || exit 0 ensures the pipeline does not fail if there is nothing to tear down
                bat 'docker compose down || exit 0'
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker Images...'
                bat 'docker compose build'
            }
        }

        stage('Docker Deploy') {
            steps {
                echo 'Starting Services...'
                bat 'docker compose up -d'
            }
        }

        stage('Health Check') {
            steps {
                echo 'Waiting for services to spin up...'
                // Small sleep to let the services start
                sleep time: 10, unit: 'SECONDS'
                
                echo 'Checking Backend Health...'
                bat 'curl -f http://localhost:8000/docs || exit 1'
                
                echo 'Checking Frontend Health...'
                // Note: Ensure your Docker configuration actually exposes port 5173. If it exposes 80, update this.
                bat 'curl -f http://localhost:5173 || exit 1'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully! All services deployed and healthy.'
        }
        failure {
            echo 'Pipeline failed. Please check the logs in Jenkins.'
            echo 'If Docker failed to connect, ensure Docker Desktop is running and Jenkins service has permissions to access it.'
        }
    }
}
