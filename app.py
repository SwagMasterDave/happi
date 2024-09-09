from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

@app.route('/get_protein_files', methods=['GET'])
def get_protein_files():
    protein_folder = './static/Proteins_MARK4/Proteins'
    files = []
    
    # Iterate over files in the directory
    for filename in os.listdir(protein_folder):
        # Construct full file path
        file_path = os.path.join(protein_folder, filename)
        # Check if it is a file (ignore directories)
        if os.path.isfile(file_path):
            files.append(file_path)
    
    # Return the list of file paths as JSON
    return jsonify(files)

@app.route('/get_sdf_files', methods=['GET'])
def get_sdf_files():
    results_folder = './static/Results_MARK4/Results'
    files = []
    
    # Iterate over files in the directory
    for filename in os.listdir(results_folder):
        # Construct full file path
        file_path = os.path.join(results_folder, filename)
        # Check if it is a file (ignore directories)
        if os.path.isfile(file_path) and filename.endswith('.txt'):  # Assuming SDF files have a '.txt' extension
            files.append(file_path)
    
    # Return the list of file paths as JSON
    return jsonify(files)
@app.route('/get_protein_files2', methods=['GET'])
def get_protein_files2():
    protein_folder = './static/Proteins_MAPT/Proteins'
    files = []
    
    # Iterate over files in the directory
    for filename in os.listdir(protein_folder):
        # Construct full file path
        file_path = os.path.join(protein_folder, filename)
        # Check if it is a file (ignore directories)
        if os.path.isfile(file_path):
            files.append(file_path)
    
    # Return the list of file paths as JSON
    return jsonify(files)

@app.route('/get_sdf_files2', methods=['GET'])
def get_sdf_files2():
    results_folder = './static/Results_MAPT/Results'
    files = []
    
    # Iterate over files in the directory
    for filename in os.listdir(results_folder):
        # Construct full file path
        file_path = os.path.join(results_folder, filename)
        # Check if it is a file (ignore directories)
        if os.path.isfile(file_path) and filename.endswith('.txt'):  # Assuming SDF files have a '.txt' extension
            files.append(file_path)
    
    # Return the list of file paths as JSON
    return jsonify(files)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/about', methods=['GET', 'POST'])
def about():
    query = request.args.get('query', '')  # Default to empty string if no query
    return render_template('about.html', query=query)

if __name__ == '__main__':
    app.run(debug=True)
