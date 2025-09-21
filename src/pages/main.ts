export default function Main() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Hello, Replicate!</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            }
            h1 {
              font-size: 3rem;
              margin: 0;
              text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }
            .subtitle {
              font-size: 1.2rem;
              margin-top: 1rem;
              opacity: 0.9;
            }
            .upload-section {
              margin-top: 2rem;
              padding: 1.5rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 15px;
              border: 2px dashed rgba(255, 255, 255, 0.3);
            }
            .upload-form {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1rem;
            }
            .file-input {
              display: none;
            }
            .file-label {
              display: inline-block;
              padding: 12px 24px;
              background: rgba(255, 255, 255, 0.2);
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.3s ease;
              font-size: 1rem;
            }
            .file-label:hover {
              background: rgba(255, 255, 255, 0.3);
              border-color: rgba(255, 255, 255, 0.5);
            }
            .upload-button {
              padding: 12px 24px;
              background: #4CAF50;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 1rem;
              transition: background 0.3s ease;
              display: none;
            }
            .upload-button:hover {
              background: #45a049;
            }
            .upload-button:disabled {
              background: #666;
              cursor: not-allowed;
            }
            .status {
              margin-top: 1rem;
              padding: 10px;
              border-radius: 8px;
              display: none;
            }
            .status.success {
              background: rgba(76, 175, 80, 0.3);
              border: 1px solid rgba(76, 175, 80, 0.5);
            }
            .status.error {
              background: rgba(244, 67, 54, 0.3);
              border: 1px solid rgba(244, 67, 54, 0.5);
            }
            .file-info {
              margin-top: 0.5rem;
              font-size: 0.9rem;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Hello, Replicate!</h1>
            <p class="subtitle">Welcome to your Cloudflare Workers application</p>
            
            <div class="upload-section">
              <h3>Upload a Photo</h3>
              <form class="upload-form" id="uploadForm">
                <input type="file" id="photoInput" class="file-input" accept="image/*" required>
                <label for="photoInput" class="file-label">Choose Photo</label>
                <div class="file-info" id="fileInfo"></div>
                <button type="submit" class="upload-button" id="uploadButton">Upload Photo</button>
              </form>
              <div class="status" id="status"></div>
            </div>
          </div>

          <script>
            const photoInput = document.getElementById('photoInput');
            const fileInfo = document.getElementById('fileInfo');
            const uploadButton = document.getElementById('uploadButton');
            const uploadForm = document.getElementById('uploadForm');
            const status = document.getElementById('status');

            // Handle file selection
            photoInput.addEventListener('change', function(e) {
              const file = e.target.files[0];
              if (file) {
                fileInfo.textContent = 'Selected: ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)';
                uploadButton.style.display = 'inline-block';
              } else {
                fileInfo.textContent = '';
                uploadButton.style.display = 'none';
              }
            });

            // Handle form submission
            uploadForm.addEventListener('submit', async function(e) {
              e.preventDefault();
              
              const file = photoInput.files[0];
              if (!file) {
                showStatus('Please select a file', 'error');
                return;
              }

              // Validate file size (max 10MB)
              if (file.size > 10 * 1024 * 1024) {
                showStatus('File size must be less than 10MB', 'error');
                return;
              }

              // Validate file type
              if (!file.type.startsWith('image/')) {
                showStatus('Please select an image file', 'error');
                return;
              }

              uploadButton.disabled = true;
              uploadButton.textContent = 'Uploading...';

              try {
                const formData = new FormData();
                formData.append('photo', file);

                const response = await fetch('/api/upload', {
                  method: 'POST',
                  body: formData
                });

                const result = await response.json();

                if (response.ok) {
                  showStatus('Photo uploaded successfully! ID: ' + result.id, 'success');
                  // Reset form
                  photoInput.value = '';
                  fileInfo.textContent = '';
                  uploadButton.style.display = 'none';
                } else {
                  showStatus('Upload failed: ' + (result.error || 'Unknown error'), 'error');
                }
              } catch (error) {
                console.error('Upload error:', error);
                showStatus('Upload failed: Network error', 'error');
              } finally {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload Photo';
              }
            });

            function showStatus(message, type) {
              status.textContent = message;
              status.className = 'status ' + type;
              status.style.display = 'block';
              
              // Hide after 5 seconds
              setTimeout(() => {
                status.style.display = 'none';
              }, 5000);
            }
          </script>
        </body>
        </html>
      `;
}