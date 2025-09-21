import { getConfig, updateConfig, Config } from '../config';

export async function HandleConfigRequest(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  
  if (request.method === 'GET') {
    try {
      const config = await getConfig(env);
      return new Response(JSON.stringify(config), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error getting config:', error);
      return new Response(JSON.stringify({ error: 'Failed to get config' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }
  
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      
      // Validate the request body
      if (typeof body !== 'object' || body === null) {
        return new Response(JSON.stringify({ error: 'Invalid request body' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      
      // Validate auto-approve field if present
      if ('auto-approve' in body && typeof body['auto-approve'] !== 'boolean') {
        return new Response(JSON.stringify({ error: 'auto-approve must be a boolean' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      
      const updatedConfig = await updateConfig(env, body as Partial<Config>);
      
      return new Response(JSON.stringify(updatedConfig), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error updating config:', error);
      return new Response(JSON.stringify({ error: 'Failed to update config' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
