pipeline {
    agent any

    environment {
        PYTHON_PATH = '/usr/bin/python3.11'
        VENV_NAME = 'django_venv'
        GITHUB_REPO = 'https://github.com/leocdt/RAGAdmin.git'
        BACKEND_DIR = 'backend'
        NVM_DIR = '/var/lib/jenkins/.nvm'
        NODE_VERSION = '16'
        PIP_CACHE_DIR = '/var/lib/jenkins/.cache/pip'
        PIP_NO_CACHE_DIR = 'false'
        VENV_PERSIST = '/var/lib/jenkins/envs/django_venv'
        NPM_CACHE_DIR = '/var/lib/jenkins/.npm'
        NPM_CONFIG_CACHE = '/var/lib/jenkins/.npm'
        MODEL_NAME = 'llama3.2:3b'
        DIR = '/var/lib/jenkins/workspace/Build'
    }

    stages {
        stage('Check Internet Connection') {
            steps {
                echo '🌐 Vérification de la connexion Internet...'
                sh '''
                    if ping -c 3 8.8.8.8 >/dev/null 2>&1; then
                        echo "✅ Connexion Internet active."
                    else
                        echo "❌ Erreur: Pas de connexion Internet."
                        exit 1
                    fi
                '''
            }
        }

        stage('Check and Install Git if Necessary') {
            steps {
                echo '🔧 Installation de Git si nécessaire...'
                sh '''
                    if ! command -v git >/dev/null 2>&1; then
                        echo "❌ Git non trouvé. Installation..."
                        sudo apt update && sudo apt install -y git
                        if ! command -v git >/dev/null 2>&1; then
                            echo "❌ Échec de l'installation de Git."
                            exit 1
                        fi
                    fi
                    echo "✅ Git installé : $(git --version)"
                '''
            }
        }

        stage('Check and Install Python 3 if Necessary') {
            steps {
                echo '🔧 Vérification et installation de Python 3 si nécessaire...'
                sh '''
            if ! command -v python3.11 >/dev/null 2>&1; then
                echo "❌ Python 3 non trouvé. Installation..."
                sudo apt update && sudo apt install python3.11
            fi
            if ! command -v python3.11-venv >/dev/null 2>&1; then
                echo "❌ Pinstalation de venv"
                sudo apt install python3.11-venv -y
            fi
            # Install Python development headers and build dependencies
            sudo apt install python3.11-dev build-essential g++ -y
            
            echo "✅ python3.11 disponible: $(python3.11 --version)"
        '''
            }
        }

        stage('Install Build Dependencies') {
            steps {
                echo '🔧 Installation des dépendances de build...'
                sh '''
                    sudo apt update
                    sudo apt install -y build-essential
                    sudo apt install -y g++-10
                    echo "✅ Dépendances de build installées"
                '''
            }
        }

        stage('Clean Workspace') {
            steps {
                echo "🧹 Nettoyage de l'espace de travail..."
                cleanWs()
                echo '✅ Espace de travail nettoyé'
            }
        }

        stage('Clean Disk Space') {
            steps {
                echo '🧹 Nettoyage de l\'espace disque...'
                sh '''
                    # Afficher l'espace disque avant nettoyage
                    echo "Espace disque avant nettoyage:"
                    df -h

                    # Nettoyer le cache apt
                    sudo apt-get clean
                    sudo apt-get autoremove -y

                    # Supprimer les anciens fichiers temporaires
                    sudo rm -rf /tmp/*
                    sudo rm -rf /var/tmp/*

                    # Nettoyer les caches pip
                    rm -rf ~/.cache/pip
                    rm -rf /var/lib/jenkins/.cache/pip

                    # Nettoyer les caches npm
                    rm -rf ~/.npm
                    rm -rf /var/lib/jenkins/.npm

                    # Afficher l'espace disque après nettoyage
                    echo "Espace disque après nettoyage:"
                    df -h
                '''
            }
        }

        stage('Check Node.js and Install if Necessary') {
            steps {
                echo '🔍 Vérification de Node.js et npm...'
                sh '''
                    # Vérifier si Node.js est installé
                    if command -v node >/dev/null 2>&1; then
                        NODE_CURRENT=$(node -v | cut -d. -f1 | tr -d v)
                        if [ "$NODE_CURRENT" -ge 16 ]; then
                            echo "✅ Node.js version suffisante trouvée: $(node -v)"
                    if command -v npm >/dev/null 2>&1; then
                        echo "✅ npm trouvé: $(npm -v)"
                    else
                        echo "❌ npm non trouvé. Lancement de l'installation..."
                        apt install npm
                        exit 1  # Signal pour lancer l'installation de npm
                    fi
                    exit 0  # Node.js et npm sont suffisants, fin du processus
                else
                    echo "⚠️ Node.js version insuffisante: $(node -v)"
                fi  
                else
                    echo "❌ Node.js non trouvé"
                fi
                # Installer nvm s'il n'est pas déjà présent
                if [ ! -d "/var/lib/jenkins/.nvm" ]; then
                    echo "⚙️ Installation de nvm..."
                    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
                fi
                # Charger nvm
                    export NVM_DIR="/var/lib/jenkins/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

                    # Installer Node.js version 16 si nécessaire
                    echo "⚙️ Installation de Node.js version 16 via nvm..."
                    nvm install 16
                    nvm alias default 16
                    nvm use default

                    # Vérification finale des versions installées
                    echo "✅ Node.js installé: $(node -v)"
                    echo "✅ npm installé: $(npm -v)"
                '''
            }
        }
        
        stage('Check npm Installation') {
            steps {
                echo '🔍 Vérification de l\'installation de npm...'
                sh '''
                    if ! command -v npm >/dev/null 2>&1; then
                        echo "❌ npm non trouvé. Installation..."
                        sudo apt update && sudo apt install -y npm
                        if ! command -v npm >/dev/null 2>&1; then
                            echo "❌ Échec de l'installation de npm."
                            exit 1
                        fi
                    fi
                    echo "✅ npm installé : $(npm -v)"
                '''
            }
        }

        stage('Clone Repo') {
            steps {
                echo '📥 Clonage du repository...'
                checkout scmGit(
                    branches: [[name: 'main']],
                    extensions: [],
                    userRemoteConfigs: [[url: "${GITHUB_REPO}"]]
                )
                sh '''
                    if [ -d "${BACKEND_DIR}" ]; then
                        echo "✅ Repository cloné avec succès"
                        ls -la
                    else
                        echo "❌ Erreur: Dossier backend non trouvé"
                        exit 1
                    fi
                '''
            }
        }

        stage('Create Venv') {
            steps {
                echo "🔧 Vérification/Création de l'environnement virtuel..."
                dir("${BACKEND_DIR}") {
                    sh '''
                        if [ ! -d "${VENV_PERSIST}" ]; then
                            echo "Création d'un nouvel environnement virtuel..."
                            python3.11 -m venv ${VENV_PERSIST}
                        else
                            echo "Utilisation de l'environnement virtuel existant"
                        fi
                        ln -sf ${VENV_PERSIST} ${VENV_NAME}
                        . ${VENV_NAME}/bin/activate
                        echo "✅ Environnement virtuel configuré"
                    '''
                }
            }
        }

        stage('Update Pip') {
            steps {
                echo '⬆️ Mise à jour de pip...'
                dir("${BACKEND_DIR}") {
                    sh '''
                        . ${VENV_NAME}/bin/activate
                        python -m pip install --upgrade pip || { echo "❌ Erreur: Mise à jour pip échouée"; exit 1; }
                        echo "✅ Pip mis à jour"
                    '''
                }
            }
        }

        stage('Install Backend Requirements') {
            steps {
                echo '📦 Installation des dépendances backend...'
                dir("${BACKEND_DIR}") {
                    sh '''
                        . ${VENV_NAME}/bin/activate
                        # Install with no cache to save disk space
                        python -m pip install --no-cache-dir -r requirements.txt || { echo "❌ Erreur: Installation dépendances échouée"; exit 1; }
                        echo "✅ Dépendances backend installées"
                    '''
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                echo '📦 Installation des dépendances frontend...'
                dir("${DIR}") {
                    sh '''
                        npm i || { echo "❌ Erreur: Installation des dépendances frontend échouée"; exit 1; }
                        echo "✅ Dépendances frontend installées"
                    '''
                }
            }
        }

        stage('Check and Setup Ollama') {
            steps {
                echo "🔍 Vérification d'Ollama et préparation du serveur..."
                sh '''
                    # Fonction pour vérifier si une commande existe
                    command_exists() {
                        command -v "$1" >/dev/null 2>&1
                    }
        
                    # Vérifier si Ollama est installé
                    if ! command_exists ollama; then
                        echo "❌ Ollama non trouvé. Installation..."
                        curl -fsSL https://ollama.com/install.sh | sh
                        if ! command_exists ollama; then
                            echo "❌ Échec de l'installation d'Ollama."
                            exit 1
                        fi
                        echo "✅ Ollama installé avec succès."
                    else
                        echo "✅ Ollama déjà installé : $(ollama --version)"
                    fi
        
                    # Lancer Ollama Serve
                    echo "⚙️ Lancement d'Ollama Serve..."
                    nohup ollama serve >/dev/null 2>&1 &
        
                    # Vérifier si le modèle requis est installé
                    MODEL_NAME="${MODEL_NAME}"  # Modèle valide
                    if ! ollama list | grep -q "${MODEL_NAME}"; then
                        echo "⚠️ Modèle '${MODEL_NAME}' non trouvé. Téléchargement..."
                        ollama pull "${MODEL_NAME}"
                        if ! ollama list | grep -q "${MODEL_NAME}"; then
                            echo "❌ Échec du téléchargement du modèle '${MODEL_NAME}'."
                            exit 1
                        fi
                        echo "✅ Modèle '${MODEL_NAME}' téléchargé avec succès."
                    else
                        echo "✅ Modèle '${MODEL_NAME}' déjà disponible."
                    fi
                '''
            }
        }
        
        stage('Fix SQLite for Python') {
            steps {
                sh '''
                    # Trouver le chemin de la bibliothèque sqlite3
                    SQLITE_LIB_PATH=$(dirname $(find /usr/local -name "libsqlite3.so" | head -n 1))
                    export LD_LIBRARY_PATH=$SQLITE_LIB_PATH:$LD_LIBRARY_PATH
        
                    # Vérifier la version de sqlite3 utilisée par Python
                    echo "Version de sqlite3 dans Python après correction :"
                    python3.11 -c "import sqlite3; print(sqlite3.sqlite_version)"
                '''
            }
        }

        stage('Start Backend Server') {
            steps {
                echo '🚀 Démarrage du serveur backend...'
                dir("${BACKEND_DIR}") {
                    sh '''
                        # Kill any existing process on port 8000
                        fuser -k 8000/tcp || true
                        . ${VENV_NAME}/bin/activate
                        echo "🔍 Vérification des dépendances installées..."
                        pip freeze

                        echo "🟢 Tentative de démarrage du serveur Django..."
                        LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH nohup python manage.py runserver 0.0.0.0:8000 > backend.log 2>&1 &

                        echo "⌛ Attente du démarrage du serveur..."
                        sleep 12

                        echo "🔍 Logs backend :"
                        tail -n 20 backend.log

                        echo "🔍 Vérification de l'accessibilité du serveur..."
                        if ! curl -v http://localhost:8000/admin > /dev/null; then
                            echo "❌ Erreur: Le serveur backend n'est pas accessible"
                            exit 1
                        fi

                        echo "✅ Serveur backend démarré avec succès"
                    '''
                }
            }
        }

        stage('Start Frontend Server') {
            steps {
                echo '🚀 Démarrage du serveur frontend...'
                sh '''
                    # Kill any existing process on port 5173
                    fuser -k 5173/tcp || true
                    # Start the frontend server with host binding
                    nohup npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
                    # Wait for server to start
                    sleep 10
                    # Verify server is running
                    if curl -s http://localhost:5173 > /dev/null; then
                        echo "✅ Serveur frontend démarré et accessible"
                    else
                        echo "❌ Erreur: Le serveur frontend n'est pas accessible"
                        echo "🔍 Logs frontend :"
                        tail -n 20 frontend.log
                        exit 1
                    fi
                '''
            }
        }

        stage('Run Tests') {
            steps {
                echo '🧪 Exécution des tests backend...'
                dir("${BACKEND_DIR}") {
                    sh '''
                        . ${VENV_NAME}/bin/activate
                        python manage.py test || { echo "❌ Erreur: Tests échoués"; exit 1; }
                        echo "✅ Tests backend réussis"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo '✅ Pipeline exécutée avec succès. Les serveurs restent actifs.'
        }
    }
}