export default function Admin() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
              margin-bottom: 30px;
            }
            .form-group {
              margin-bottom: 20px;
            }
            label {
              display: flex;
              align-items: center;
              font-size: 16px;
              color: #555;
              cursor: pointer;
            }
            input[type="checkbox"] {
              margin-right: 10px;
              transform: scale(1.2);
            }
            button {
              background-color: #007bff;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 4px;
              font-size: 16px;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            button:hover {
              background-color: #0056b3;
            }
            button:disabled {
              background-color: #6c757d;
              cursor: not-allowed;
            }
            .status {
              margin-top: 15px;
              padding: 10px;
              border-radius: 4px;
              display: none;
            }
            .status.success {
              background-color: #d4edda;
              color: #155724;
              border: 1px solid #c3e6cb;
            }
            .status.error {
              background-color: #f8d7da;
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
            .photos-section {
              margin-top: 40px;
              padding-top: 30px;
              border-top: 1px solid #eee;
            }
            .photos-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .photos-table th,
            .photos-table td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            .photos-table th {
              background-color: #f8f9fa;
              font-weight: 600;
              color: #333;
            }
            .photos-table tr:hover {
              background-color: #f5f5f5;
            }
            .photo-links {
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
            }
            .photo-links a {
              color: #007bff;
              text-decoration: none;
              font-size: 12px;
              padding: 4px 8px;
              border: 1px solid #007bff;
              border-radius: 3px;
              transition: all 0.2s;
            }
            .photo-links a:hover {
              background-color: #007bff;
              color: white;
            }
            .checkbox-cell {
              text-align: center;
            }
            .loading {
              text-align: center;
              padding: 20px;
              color: #666;
            }
            .process-btn {
              background-color: #28a745;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              font-size: 12px;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            .process-btn:hover {
              background-color: #218838;
            }
            .process-btn:disabled {
              background-color: #6c757d;
              cursor: not-allowed;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Admin Configuration</h1>
            
            <form id="configForm">
              <div class="form-group">
                <label>
                  <input type="checkbox" id="autoApprove" name="auto-approve">
                  Auto-approve requests
                </label>
              </div>
              
              <button type="submit" id="saveButton">Save Configuration</button>
            </form>
            
            <div id="status" class="status"></div>
            
            <div class="photos-section">
              <h2>Photos Management</h2>
              <div id="photosContainer">
                <div class="loading">Loading photos...</div>
              </div>
            </div>
          </div>

          <script>
            let currentConfig = {};

            // Load current config on page load
            async function loadConfig() {
              try {
                const response = await fetch('/api/config');
                if (response.ok) {
                  currentConfig = await response.json();
                  document.getElementById('autoApprove').checked = currentConfig['auto-approve'] || false;
                } else {
                  showStatus('Failed to load configuration', 'error');
                }
              } catch (error) {
                console.error('Error loading config:', error);
                showStatus('Failed to load configuration', 'error');
              }
            }

            // Save config
            async function saveConfig(config) {
              try {
                const response = await fetch('/api/config', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(config),
                });

                if (response.ok) {
                  currentConfig = await response.json();
                  showStatus('Configuration saved successfully!', 'success');
                } else {
                  const error = await response.json();
                  showStatus('Failed to save configuration: ' + (error.error || 'Unknown error'), 'error');
                }
              } catch (error) {
                console.error('Error saving config:', error);
                showStatus('Failed to save configuration', 'error');
              }
            }

            // Show status message
            function showStatus(message, type) {
              const statusEl = document.getElementById('status');
              statusEl.textContent = message;
              statusEl.className = 'status ' + type;
              statusEl.style.display = 'block';
              
              // Hide after 3 seconds
              setTimeout(() => {
                statusEl.style.display = 'none';
              }, 3000);
            }

            // Handle form submission
            document.getElementById('configForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const saveButton = document.getElementById('saveButton');
              saveButton.disabled = true;
              saveButton.textContent = 'Saving...';
              
              const autoApprove = document.getElementById('autoApprove').checked;
              
              await saveConfig({
                'auto-approve': autoApprove
              });
              
              saveButton.disabled = false;
              saveButton.textContent = 'Save Configuration';
            });

            // Load config when page loads
            loadConfig();

            // Photos management functions
            async function loadPhotos() {
              try {
                const response = await fetch('/api/photos');
                if (response.ok) {
                  const photos = await response.json();
                  renderPhotosTable(photos);
                } else {
                  document.getElementById('photosContainer').innerHTML = 
                    '<div class="loading">Failed to load photos</div>';
                }
              } catch (error) {
                console.error('Error loading photos:', error);
                document.getElementById('photosContainer').innerHTML = 
                  '<div class="loading">Failed to load photos</div>';
              }
            }

            function renderPhotosTable(photos) {
              if (photos.length === 0) {
                document.getElementById('photosContainer').innerHTML = 
                  '<div class="loading">No photos found</div>';
                return;
              }

              let tableHTML = '<table class="photos-table">';
              tableHTML += '<thead><tr>';
              tableHTML += '<th>ID</th>';
              tableHTML += '<th>Created</th>';
              tableHTML += '<th>Public</th>';
              tableHTML += '<th>Moderated</th>';
              tableHTML += '<th>Process</th>';
              tableHTML += '<th>Links</th>';
              tableHTML += '</tr></thead>';
              tableHTML += '<tbody>';
              
              photos.forEach((photo) => {
                tableHTML += '<tr>';
                tableHTML += '<td>' + photo.id + '</td>';
                tableHTML += '<td>' + (photo.create_timestamp ? new Date(photo.create_timestamp).toLocaleString() : 'N/A') + '</td>';
                tableHTML += '<td class="checkbox-cell">';
                tableHTML += '<input type="checkbox" ' + (photo.is_public ? 'checked' : '') + ' onchange="updatePhotoField(' + photo.id + ', \\'is_public\\', this.checked)">';
                tableHTML += '</td>';
                tableHTML += '<td class="checkbox-cell">';
                tableHTML += '<input type="checkbox" ' + (photo.is_moderated ? 'checked' : '') + ' onchange="updatePhotoField(' + photo.id + ', \\'is_moderated\\', this.checked)">';
                tableHTML += '</td>';
                tableHTML += '<td>';
                tableHTML += '<button onclick="processPhoto(' + photo.id + ')" class="process-btn" id="process-btn-' + photo.id + '">Process</button>';
                tableHTML += '</td>';
                tableHTML += '<td><div class="photo-links">';
                
                if (photo.original_r2_url) {
                  tableHTML += '<a href="' + photo.original_r2_url + '" target="_blank">Original</a>';
                }
                if (photo.phase1_replicate_url) {
                  tableHTML += '<a href="' + photo.phase1_replicate_url + '" target="_blank">Phase1</a>';
                }
                if (photo.phase1_r2_url) {
                  tableHTML += '<a href="' + photo.phase1_r2_url + '" target="_blank">Phase1 R2</a>';
                }
                if (photo.phase2_replicate_url) {
                  tableHTML += '<a href="' + photo.phase2_replicate_url + '" target="_blank">Phase2</a>';
                }
                if (photo.phase2_r2_url) {
                  tableHTML += '<a href="' + photo.phase2_r2_url + '" target="_blank">Phase2 R2</a>';
                }
                if (photo.phase3_replicate_url) {
                  tableHTML += '<a href="' + photo.phase3_replicate_url + '" target="_blank">Phase3</a>';
                }
                if (photo.phase3_r2_url) {
                  tableHTML += '<a href="' + photo.phase3_r2_url + '" target="_blank">Phase3 R2</a>';
                }
                
                tableHTML += '</div></td>';
                tableHTML += '</tr>';
              });
              
              tableHTML += '</tbody></table>';
              
              document.getElementById('photosContainer').innerHTML = tableHTML;
            }

            async function updatePhotoField(photoId, field, value) {
              try {
                const response = await fetch('/api/photos/' + photoId, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ [field]: value }),
                });

                if (response.ok) {
                  showStatus(field + ' updated successfully!', 'success');
                } else {
                  showStatus('Failed to update ' + field, 'error');
                  // Revert checkbox state
                  const checkbox = event.target;
                  checkbox.checked = !checkbox.checked;
                }
              } catch (error) {
                console.error('Error updating photo:', error);
                showStatus('Failed to update ' + field, 'error');
                // Revert checkbox state
                const checkbox = event.target;
                checkbox.checked = !checkbox.checked;
              }
            }

            // Process photo workflow
            async function processPhoto(photoId) {
              const button = document.getElementById('process-btn-' + photoId);
              const originalText = button.textContent;
              
              try {
                button.disabled = true;
                button.textContent = 'Processing...';
                
                const response = await fetch('/api/photos/' + photoId + '/process', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });

                if (response.ok) {
                  const result = await response.json();
                  showStatus('Photo processing workflow started! Workflow ID: ' + result.workflowId, 'success');
                  
                  // Start polling for status updates
                  pollPhotoStatus(photoId);
                } else {
                  const error = await response.json();
                  showStatus('Failed to start processing: ' + (error.error || 'Unknown error'), 'error');
                  button.disabled = false;
                  button.textContent = originalText;
                }
              } catch (error) {
                console.error('Error processing photo:', error);
                showStatus('Failed to start processing', 'error');
                button.disabled = false;
                button.textContent = originalText;
              }
            }

            // Poll photo processing status
            async function pollPhotoStatus(photoId) {
              const button = document.getElementById('process-btn-' + photoId);
              
              try {
                const response = await fetch('/api/photos/' + photoId + '/status');
                if (response.ok) {
                  const status = await response.json();
                  
                  if (status.status === 'completed') {
                    button.textContent = 'Completed';
                    button.style.backgroundColor = '#28a745';
                    showStatus('Photo processing completed!', 'success');
                    // Reload photos to show new results
                    loadPhotos();
                  } else if (status.status === 'processing') {
                    button.textContent = 'Processing... (' + status.progress + '%)';
                    // Continue polling
                    setTimeout(() => pollPhotoStatus(photoId), 2000);
                  } else {
                    button.textContent = 'Process';
                    button.disabled = false;
                    showStatus('Processing failed or pending', 'error');
                  }
                } else {
                  button.textContent = 'Process';
                  button.disabled = false;
                  showStatus('Failed to get processing status', 'error');
                }
              } catch (error) {
                console.error('Error polling status:', error);
                button.textContent = 'Process';
                button.disabled = false;
                showStatus('Failed to get processing status', 'error');
              }
            }

            // Make functions globally available
            window.updatePhotoField = updatePhotoField;
            window.processPhoto = processPhoto;

            // Load photos when page loads
            loadPhotos();
          </script>
        </body>
        </html>
    `;
}