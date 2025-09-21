async function HandleApiRequest(request: Request): Promise<Response> {
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
    return new Response('Not Found', { 
        status: 404,
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}

export { HandleApiRequest };
