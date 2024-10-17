pipeline {
    agent any

    environment {
        // Set up Python environment variables if needed
        PYTHON_VERSION = '3.8' // Specify your Python version
        VENV_DIR = 'backend/venv' // Virtual environment directory
        NODE_VERSION = '16'
    }

    stages {
        stage('Checkout') {
            steps {
                // Clone the repository
                git url: 'http://10.0.2.10:3000/username/repo.git', branch: 'main' // Adjust URL and branch as needed
            }
        }
        
        stage('Set Up Python Environment') {
            steps {
                script {
                    // Set up the virtual environment
                    sh "python${PYTHON_VERSION} -m venv ${VENV_DIR}"
                    sh "${VENV_DIR}/bin/pip install -r backend/requirements.txt" // Install dependencies
                }
            }
        }
        
        stage('Set Up Node Environment') {
            steps {
                script {
                    sh "nvm use ${NODE_VERSION}"
                    sh "npm install"
                }
            }
        }
        
        stage('Run Backend Tests') {
            steps {
                script {
                    // Activate the virtual environment and run tests
                    sh "cd backend && ${VENV_DIR}/bin/python manage.py test" // Adjust if you have specific test commands
                }
            }
        }
        
        stage('Run Frontend Tests') {
            steps {
                script {
                    sh "npm run test"
                }
            }
        }
        
        stage('Build Frontend') {
            steps {
                script {
                    sh "npm run build"
                }
            }
        }

        stage('Collect Static Files') {
            steps {
                script {
                    sh "cd backend && ${VENV_DIR}/bin/python manage.py collectstatic --noinput"
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    // Deploy your Django application
                    // Example for a generic deployment command
                    // You can replace this with your actual deployment steps
                    echo "Deploying the application..."
                    // For example, copying files to a server or updating a service
                }
            }
        }
    }

    post {
        success {
            // Actions to perform on success, e.g., notify or archive artifacts
            echo 'The build was successful!'
        }
        failure {
            // Actions to perform on failure
            echo 'The build failed. Check the logs!'
        }
    }
}
