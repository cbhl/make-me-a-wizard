export default function Main() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Photo Gallery</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 0;
              background: #000000;
              color: white;
              min-height: 100vh;
            }
            
            .upload-widget {
              position: fixed;
              top: 20px;
              right: 20px;
              z-index: 1000;
              padding: 1rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 15px;
              backdrop-filter: blur(10px);
              border: 2px solid rgba(255, 255, 255, 0.2);
              max-width: 300px;
            }
            
            .upload-form {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.5rem;
            }
            
            .file-input {
              display: none;
            }
            
            .file-label {
              display: inline-block;
              padding: 8px 16px;
              background: rgba(255, 255, 255, 0.2);
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.3s ease;
              font-size: 0.9rem;
              text-align: center;
            }
            
            .file-label:hover {
              background: rgba(255, 255, 255, 0.3);
              border-color: rgba(255, 255, 255, 0.5);
            }
            
            .upload-button {
              padding: 8px 16px;
              background: #4CAF50;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 0.9rem;
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
              margin-top: 0.5rem;
              padding: 8px;
              border-radius: 8px;
              display: none;
              font-size: 0.8rem;
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
              margin-top: 0.25rem;
              font-size: 0.8rem;
              opacity: 0.8;
              text-align: center;
            }
            
            .gallery-container {
              padding: 20px;
              padding-top: 120px; /* Space for upload widget */
            }
            
            .video-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
              gap: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }
            
            .video-item {
              background: rgba(255, 255, 255, 0.05);
              border-radius: 12px;
              overflow: hidden;
              transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            .video-item:hover {
              transform: translateY(-5px);
              box-shadow: 0 10px 30px rgba(255, 255, 255, 0.1);
            }
            
            .video-item video {
              width: 100%;
              height: auto;
              display: block;
            }
            
            .video-meta {
              padding: 12px;
              font-size: 0.9rem;
              opacity: 0.8;
            }
            
            .loading {
              text-align: center;
              padding: 40px;
              font-size: 1.2rem;
              opacity: 0.7;
            }
            
            .error {
              text-align: center;
              padding: 40px;
              color: #ff6b6b;
            }
            
            .empty {
              text-align: center;
              padding: 40px;
              opacity: 0.7;
            }
          </style>
        </head>
        <body>
          <div class="upload-widget">
            <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Upload Photo</h4>
            <form class="upload-form" id="uploadForm">
              <input type="file" id="photoInput" class="file-input" accept="image/*" required>
              <label for="photoInput" class="file-label">Choose Photo</label>
              <div class="file-info" id="fileInfo"></div>
              <button type="submit" class="upload-button" id="uploadButton">Upload</button>
            </form>
            <div class="status" id="status"></div>
          </div>

          <div class="gallery-container">
            <div id="gallery-content">
              <div class="loading">Loading videos...</div>
            </div>
          </div>

          <script>
            const photoInput = document.getElementById('photoInput');
            const fileInfo = document.getElementById('fileInfo');
            const uploadButton = document.getElementById('uploadButton');
            const uploadForm = document.getElementById('uploadForm');
            const status = document.getElementById('status');
            const galleryContent = document.getElementById('gallery-content');

            // Polling interval for browsing videos
            let pollInterval;

            // Load and display videos
            async function loadVideos() {
              try {
                const response = await fetch('/api/browse');
                const videos = await response.json();

                if (!response.ok) {
                  throw new Error('Failed to load videos');
                }

                if (videos.length === 0) {
                  galleryContent.innerHTML = '<div class="empty">No videos available yet. Upload a photo to get started!</div>';
                  return;
                }

                const videoGrid = document.createElement('div');
                videoGrid.className = 'video-grid';

                videos.forEach(video => {
                  const videoItem = document.createElement('div');
                  videoItem.className = 'video-item';
                  
                  const videoElement = document.createElement('video');
                  videoElement.src = video.phase3_r2_url;
                  videoElement.controls = true;
                  videoElement.muted = true;
                  videoElement.loop = true;
                  videoElement.autoplay = true;
                  
                  const meta = document.createElement('div');
                  meta.className = 'video-meta';
                  meta.textContent = 'ID: ' + video.id + ' • Created: ' + new Date(video.create_timestamp).toLocaleDateString();
                  
                  videoItem.appendChild(videoElement);
                  videoItem.appendChild(meta);
                  videoGrid.appendChild(videoItem);
                });

                galleryContent.innerHTML = '';
                galleryContent.appendChild(videoGrid);
              } catch (error) {
                console.error('Error loading videos:', error);
                galleryContent.innerHTML = '<div class="error">Failed to load videos. Please try again later.</div>';
              }
            }

            // Start polling for videos
            function startPolling() {
              loadVideos(); // Load immediately
              pollInterval = setInterval(loadVideos, 60000); // Poll every 1 minute
            }

            // Stop polling
            function stopPolling() {
              if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }
            }

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
                  
                  // Trigger photo processing workflow
                  try {
                    const processResponse = await fetch('/api/photos/' + result.id + '/process', {
                      method: 'POST'
                    });
                    
                    if (processResponse.ok) {
                      const processResult = await processResponse.json();
                      showStatus('Photo uploaded and processing started! Workflow ID: ' + processResult.workflowId, 'success');
                    } else {
                      const processError = await processResponse.json();
                      showStatus('Photo uploaded but processing failed to start: ' + (processError.error || 'Unknown error'), 'error');
                    }
                  } catch (processError) {
                    console.error('Failed to trigger processing:', processError);
                    showStatus('Photo uploaded but processing failed to start: Network error', 'error');
                  }
                  
                  // Reset form
                  photoInput.value = '';
                  fileInfo.textContent = '';
                  uploadButton.style.display = 'none';
                  
                  // Refresh videos after successful upload
                  loadVideos();
                } else {
                  let errorMessage = result.error || 'Unknown error';
                  if (result.details) {
                    errorMessage += ': ' + result.details;
                  }
                  showStatus('Upload failed: ' + errorMessage, 'error');
                  console.error('Upload failed:', result);
                }
              } catch (error) {
                console.error('Upload error:', error);
                showStatus('Upload failed: Network error', 'error');
              } finally {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload';
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

            // Initialize the page
            document.addEventListener('DOMContentLoaded', function() {
              startPolling();
            });

            // Clean up when page unloads
            window.addEventListener('beforeunload', function() {
              stopPolling();
            });
          </script>
        </body>
        </html>
      `;
}