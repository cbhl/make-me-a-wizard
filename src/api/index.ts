import { HandleConfigRequest } from './config';
import PhotoProcessingWorkflow from '../workflows/photo-processing';

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

    if (url.pathname === '/api/browse') {
        if (request.method === 'GET') {
            // Query photos with phase3_r2_url not null, is_public = true, is_moderated = false
            const photos = await env.repl_demo_2025_d1.prepare(`
                SELECT id, phase3_r2_url, create_timestamp, update_timestamp, publish_timestamp 
                FROM Photos 
                WHERE phase3_r2_url IS NOT NULL 
                AND is_public = 1 
                AND is_moderated = 0 
                ORDER BY create_timestamp DESC
            `).all();
            
            return new Response(JSON.stringify(photos.results), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
        return new Response('Method Not Allowed', { status: 405 });
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

    if (url.pathname === '/api/upload' && request.method === 'POST') {
        try {
            console.log('Starting photo upload process');
            
            const formData = await request.formData();
            const file = formData.get('photo') as File | null;
            
            if (!file) {
                console.log('Upload failed: No file provided');
                return new Response(JSON.stringify({ error: 'No file provided' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            console.log(`Processing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                console.log(`Upload failed: File too large - ${file.size} bytes`);
                return new Response(JSON.stringify({ error: 'File size must be less than 10MB' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                console.log(`Upload failed: Invalid file type - ${file.type}`);
                return new Response(JSON.stringify({ error: 'Please select an image file' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Generate unique filename
            const fileExtension = file.name.split('.').pop() || 'jpg';
            const uuid = crypto.randomUUID();
            const objectKey = `uploads/${uuid}.${fileExtension}`;
            
            console.log(`Generated object key: ${objectKey}`);
            
            // Upload to R2
            try {
                console.log('Uploading to R2...');
                await env.R2.put(objectKey, file.stream(), {
                    httpMetadata: {
                        contentType: file.type,
                    },
                });
                console.log('R2 upload successful');
            } catch (r2Error) {
                console.error('R2 upload failed:', r2Error);
                return new Response(JSON.stringify({ 
                    error: 'Failed to upload file to storage',
                    details: r2Error instanceof Error ? r2Error.message : 'Unknown R2 error'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            
            // Generate public URL (assuming custom domain or public bucket)
            const r2Url = `https://photos.demo.xianwen.dev/${objectKey}`;
            console.log(`Generated R2 URL: ${r2Url}`);
            
            // Insert into database
            try {
                console.log('Inserting into database...');
                const result = await env.repl_demo_2025_d1.prepare(`
                    INSERT INTO Photos (
                        create_timestamp,
                        update_timestamp,
                        original_r2_object_path,
                        original_r2_url,
                        is_public,
                        is_moderated
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `).bind(
                    new Date().toISOString(),
                    new Date().toISOString(),
                    objectKey,
                    r2Url,
                    1, // is_public = true
                    0  // is_moderated = false
                ).run();
                
                console.log(`Database insert successful, photo ID: ${result.meta.last_row_id}`);
                
                return new Response(JSON.stringify({ 
                    id: result.meta.last_row_id,
                    message: 'Photo uploaded successfully'
                }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            } catch (dbError) {
                console.error('Database insert failed:', dbError);
                // Try to clean up the R2 object
                try {
                    await env.R2.delete(objectKey);
                    console.log('Cleaned up R2 object after database failure');
                } catch (cleanupError) {
                    console.error('Failed to cleanup R2 object:', cleanupError);
                }
                
                return new Response(JSON.stringify({ 
                    error: 'Failed to save photo metadata',
                    details: dbError instanceof Error ? dbError.message : 'Unknown database error'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            return new Response(JSON.stringify({ 
                error: 'Upload failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    if (url.pathname.startsWith('/api/photos/') && url.pathname.endsWith('/process') && request.method === 'POST') {
        // Trigger photo processing workflow
        const photoId = parseInt(url.pathname.split('/')[3]);
        
        if (isNaN(photoId)) {
            return new Response(JSON.stringify({ error: 'Invalid photo ID' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        try {
            console.log(`Starting workflow for photo ID: ${photoId}`);
            
            // Check if photo exists
            console.log('Checking if photo exists in database...');
            const photo = await env.repl_demo_2025_d1.prepare(
                'SELECT id FROM Photos WHERE id = ?'
            ).bind(photoId).first();

            if (!photo) {
                console.log(`Photo ${photoId} not found in database`);
                return new Response(JSON.stringify({ error: 'Photo not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            console.log(`Photo ${photoId} found, starting workflow...`);

            // Check if workflow binding exists
            if (!env.PHOTO_PROCESSING_WORKFLOW) {
                const error = 'PHOTO_PROCESSING_WORKFLOW binding not found';
                console.error(error);
                return new Response(JSON.stringify({ error: 'Workflow service not available' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Start the workflow
            const workflow = env.PHOTO_PROCESSING_WORKFLOW;
            const workflowInstancePromise : Promise<WorkflowInstance> = workflow.create({
                params: {
                    photoId: photoId
                }
            });

            const workflowInstance = await workflowInstancePromise;

            console.log(`Workflow started successfully with ID: ${workflowInstance.id}`);

            return new Response(JSON.stringify({ 
                workflowId: workflowInstance.id,
                message: 'Photo processing workflow started'
            }), {
                headers: { 'Content-Type': 'application/json' },
            });

        } catch (error) {
            console.error('Workflow trigger error:', error);
            return new Response(JSON.stringify({ 
                error: 'Failed to start workflow',
                details: error instanceof Error ? error.message : 'Unknown error'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    if (url.pathname.startsWith('/api/photos/') && url.pathname.endsWith('/status') && request.method === 'GET') {
        // Get photo processing status
        const photoId = parseInt(url.pathname.split('/')[3]);
        
        if (isNaN(photoId)) {
            return new Response(JSON.stringify({ error: 'Invalid photo ID' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        try {
            const photo = await env.repl_demo_2025_d1.prepare(
                'SELECT * FROM Photos WHERE id = ?'
            ).bind(photoId).first();

            if (!photo) {
                return new Response(JSON.stringify({ error: 'Photo not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Determine processing status
            let status = 'pending';
            let progress = 0;
            let currentPhase = '';

            if (photo.phase1_r2_url) {
                progress = 100;
                status = 'completed';
                currentPhase = 'completed';
            } else if (photo.phase3_replicate_prediction) {
                progress = 90;
                status = 'processing';
                currentPhase = 'phase3';
            } else if (photo.phase2_replicate_prediction) {
                progress = 60;
                status = 'processing';
                currentPhase = 'phase2';
            } else if (photo.phase1_replicate_prediction) {
                progress = 30;
                status = 'processing';
                currentPhase = 'phase1';
            }

            return new Response(JSON.stringify({
                photoId: photo.id,
                status,
                progress,
                currentPhase,
                results: {
                    phase1: photo.phase1_r2_url ? {
                        url: photo.phase1_r2_url,
                        completed: true
                    } : null,
                    phase2: photo.phase2_r2_url ? {
                        url: photo.phase2_r2_url,
                        completed: true
                    } : null,
                    phase3: photo.phase3_r2_url ? {
                        url: photo.phase3_r2_url,
                        completed: true
                    } : null
                }
            }), {
                headers: { 'Content-Type': 'application/json' },
            });

        } catch (error) {
            console.error('Status check error:', error);
            return new Response(JSON.stringify({ error: 'Failed to get status' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }
    
    return new Response('Not Found', { 
        status: 404,
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}

export { HandleApiRequest };
