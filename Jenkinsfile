pipeline {
    agent any

    // We use the tools we just configured in Jenkins
    tools {
        nodejs 'node20'
    }

    stages {
        stage('Checkout') {
            steps {
                // This checks out your code from GitHub
                checkout scm
            }
        }

        stage('Frontend Build Test') {
            steps {
                echo 'Installing Frontend Dependencies...'
                // Since you are on Windows, we use 'bat' instead of 'sh'
                bat 'npm install'
                
                echo 'Building Frontend (Vite)...'
                bat 'npm run build'
            }
        }

        stage('Docker Deployment') {
            steps {
                echo 'Building and Deploying Full Stack via Docker Compose...'
                // This will stop old containers, rebuild the images with your new code, and start them in the background
                bat 'docker-compose down'
                bat 'docker-compose up -d --build'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully! Your app is deployed.'
        }
        failure {
            echo 'Pipeline failed. Please check the logs in Jenkins.'
        }
    }
}
