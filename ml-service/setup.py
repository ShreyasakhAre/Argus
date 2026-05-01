import nltk
import os

def setup():
    print("Setting up ARGUS ML Service environment...")
    
    # Download necessary NLTK data
    components = ['punkt', 'stopwords', 'wordnet', 'omw-1.4', 'averaged_perceptron_tagger']
    for component in components:
        print(f"Downloading NLTK component: {component}...")
        nltk.download(component)
        
    # Ensure dataset directory exists
    if not os.path.exists('dataset'):
        os.makedirs('dataset')
        print("Created dataset directory")
        
    # Ensure models directory exists
    if not os.path.exists('models'):
        os.makedirs('models')
        print("Created models directory")
        
    print("Environment setup complete.")

if __name__ == "__main__":
    setup()
