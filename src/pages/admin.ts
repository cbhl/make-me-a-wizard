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
          </script>
        </body>
        </html>
    `;
}