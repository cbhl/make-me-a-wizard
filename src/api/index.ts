import { HandleConfigRequest } from './config';

async function HandleApiRequest(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
        return new Response('Internal Server Error', { 
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
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

    if (url.pathname === '/api/config') {
        return HandleConfigRequest(request, env);
    }

    if (url.pathname === '/api/photos') {
        if (request.method === 'GET') {
            // List all photos
            const photos = await env.repl_demo_2025_d1.prepare('SELECT * FROM Photos ORDER BY create_timestamp DESC').all();
            return new Response(JSON.stringify(photos.results), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
        return new Response('Method Not Allowed', { status: 405 });
    }

    if (url.pathname.startsWith('/api/photos/') && request.method === 'PATCH') {
        // Update photo
        const photoId = url.pathname.split('/')[3];
        const body = await request.json() as { is_public?: boolean; is_moderated?: boolean };
        
        if (body.is_public !== undefined || body.is_moderated !== undefined) {
            const updates = [];
            const values = [];
            
            if (body.is_public !== undefined) {
                updates.push('is_public = ?');
                values.push(body.is_public ? 1 : 0);
            }
            
            if (body.is_moderated !== undefined) {
                updates.push('is_moderated = ?');
                values.push(body.is_moderated ? 1 : 0);
            }
            
            updates.push('update_timestamp = datetime("now")');
            values.push(photoId);
            
            const query = `UPDATE Photos SET ${updates.join(', ')} WHERE id = ?`;
            await env.repl_demo_2025_d1.prepare(query).bind(...values).run();
            
            return new Response(JSON.stringify({ success: true }), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
        
        return new Response('Bad Request', { status: 400 });
    }
    
    return new Response('Not Found', { 
        status: 404,
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}

export { HandleApiRequest };
