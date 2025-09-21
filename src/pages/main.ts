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
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Hello, Replicate!</h1>
            <p class="subtitle">Welcome to your Cloudflare Workers application</p>
          </div>
        </body>
        </html>
      `;
}