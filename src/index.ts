import { Main, Admin } from './pages';

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Route handling
    if (url.pathname === '/') {
      return new Response(Main(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    if (url.pathname === '/admin') {
      return new Response(Admin(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }
    
    if (url.pathname === '/api/demo') {
      // API endpoint that returns JSON
      const response = {
        message: "Hello, Replicate!"
      };
      
      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // 404 for any other routes
    return new Response('Not Found', { 
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },
};
