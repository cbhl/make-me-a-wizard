import { WorkflowEntrypoint } from 'cloudflare:workers';

interface PhotoProcessingInput {
  photoId: number;
}

interface Photo {
  id: number;
  original_r2_url: string;
  phase1_replicate_prediction?: string;
  phase1_replicate_url?: string;
  phase1_r2_object_path?: string;
  phase1_r2_url?: string;
  phase2_replicate_prediction?: string;
  phase2_replicate_url?: string;
  phase2_r2_object_path?: string;
  phase2_r2_url?: string;
  phase3_replicate_prediction?: string;
  phase3_replicate_url?: string;
  phase3_r2_object_path?: string;
  phase3_r2_url?: string;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  urls?: {
    get: string;
  };
  output?: string | string[];
  error?: string;
}

class PhotoProcessingWorkflow extends WorkflowEntrypoint {
  async run(event: any, step: any): Promise<void> {
    const { photoId } = event as PhotoProcessingInput;
    const env = step.env;
    
    try {
      // Fetch photo from database
      const photo = await this.fetchPhoto(photoId, env);
      if (!photo) {
        throw new Error(`Photo with ID ${photoId} not found`);
      }

      // Phase 1: flux-kontext-pro
      await this.processPhase1(photo, env);
      
      // Phase 2: advanced-face-swap
      await this.processPhase2(photo, env);
      
      // Phase 3: hailuo-02-fast
      await this.processPhase3(photo, env);
      
    } catch (error) {
      console.error('Photo processing workflow failed:', error);
      throw error;
    }
  }

  private async fetchPhoto(photoId: number, env: any): Promise<Photo | null> {
    const result = await env.repl_demo_2025_d1.prepare(
      'SELECT * FROM Photos WHERE id = ?'
    ).bind(photoId).first();
    
    return result as Photo | null;
  }

  private async updatePhoto(photoId: number, updates: Partial<Photo>, env: any): Promise<void> {
    const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(photoId);
    
    await env.repl_demo_2025_d1.prepare(
      `UPDATE Photos SET ${updateFields}, update_timestamp = datetime("now") WHERE id = ?`
    ).bind(...values).run();
  }

  private async processPhase1(photo: Photo, env: any): Promise<void> {
    console.log(`Starting Phase 1 for photo ${photo.id}`);
    
    // Call flux-kontext-pro model
    const prediction = await this.callReplicateModel(
      'black-forest-labs/flux-kontext-pro',
      {
        prompt: "Make me a wizard, Harry! Put me in front of a neutral, dark background.",
        input_image: photo.original_r2_url
      },
      env
    );

    // Update database with prediction
    await this.updatePhoto(photo.id, {
      phase1_replicate_prediction: prediction.id,
      phase1_replicate_url: prediction.urls?.get
    }, env);

    // Poll until completion
    const completedPrediction = await this.pollReplicatePrediction(prediction.id, env);
    
    if (completedPrediction.status !== 'succeeded') {
      throw new Error(`Phase 1 failed: ${completedPrediction.error || 'Unknown error'}`);
    }

    // Download and store result in R2
    const resultUrl = completedPrediction.urls?.get;
    if (!resultUrl) {
      throw new Error('Phase 1 completed but no result URL found');
    }

    const fileExtension = this.getFileExtension(resultUrl);
    const r2ObjectPath = `phase1/${photo.id}.${fileExtension}`;
    const r2Url = `https://photos.demo.xianwen.dev/${r2ObjectPath}`;

    await this.downloadAndStoreInR2(resultUrl, r2ObjectPath, env);

    // Update database with R2 info
    await this.updatePhoto(photo.id, {
      phase1_r2_object_path: r2ObjectPath,
      phase1_r2_url: r2Url
    }, env);

    console.log(`Phase 1 completed for photo ${photo.id}`);
  }

  private async processPhase2(photo: Photo, env: any): Promise<void> {
    console.log(`Starting Phase 2 for photo ${photo.id}`);
    
    if (!photo.phase1_r2_url) {
      throw new Error('Phase 1 result not available for Phase 2');
    }

    // Call advanced-face-swap model
    const prediction = await this.callReplicateModel(
      'easel/advanced-face-swap',
      {
        target_image: photo.phase1_r2_url,
        swap_image: photo.original_r2_url,
        upscale: false
      },
      env
    );

    // Update database with prediction
    await this.updatePhoto(photo.id, {
      phase2_replicate_prediction: prediction.id,
      phase2_replicate_url: prediction.urls?.get
    }, env);

    // Poll until completion
    const completedPrediction = await this.pollReplicatePrediction(prediction.id, env);
    
    if (completedPrediction.status !== 'succeeded') {
      throw new Error(`Phase 2 failed: ${completedPrediction.error || 'Unknown error'}`);
    }

    // Download and store result in R2
    const resultUrl = completedPrediction.urls?.get;
    if (!resultUrl) {
      throw new Error('Phase 2 completed but no result URL found');
    }

    const fileExtension = this.getFileExtension(resultUrl);
    const r2ObjectPath = `phase2/${photo.id}.${fileExtension}`;
    const r2Url = `https://photos.demo.xianwen.dev/${r2ObjectPath}`;

    await this.downloadAndStoreInR2(resultUrl, r2ObjectPath, env);

    // Update database with R2 info
    await this.updatePhoto(photo.id, {
      phase2_r2_object_path: r2ObjectPath,
      phase2_r2_url: r2Url
    }, env);

    console.log(`Phase 2 completed for photo ${photo.id}`);
  }

  private async processPhase3(photo: Photo, env: any): Promise<void> {
    console.log(`Starting Phase 3 for photo ${photo.id}`);
    
    if (!photo.phase2_r2_url) {
      throw new Error('Phase 2 result not available for Phase 3');
    }

    // Call hailuo-02-fast model
    const prediction = await this.callReplicateModel(
      'minimax/hailuo-02-fast',
      {
        prompt: "a living portrait of a wizard from harry potter. keep motions subtle and gentle",
        first_frame_image: photo.phase2_r2_url,
        go_fast: true
      },
      env
    );

    // Update database with prediction
    await this.updatePhoto(photo.id, {
      phase3_replicate_prediction: prediction.id,
      phase3_replicate_url: prediction.urls?.get
    }, env);

    // Poll until completion
    const completedPrediction = await this.pollReplicatePrediction(prediction.id, env);
    
    if (completedPrediction.status !== 'succeeded') {
      throw new Error(`Phase 3 failed: ${completedPrediction.error || 'Unknown error'}`);
    }

    // Download and store result in R2
    const resultUrl = completedPrediction.urls?.get;
    if (!resultUrl) {
      throw new Error('Phase 3 completed but no result URL found');
    }

    const fileExtension = this.getFileExtension(resultUrl);
    const r2ObjectPath = `phase3/${photo.id}.${fileExtension}`;
    const r2Url = `https://photos.demo.xianwen.dev/${r2ObjectPath}`;

    await this.downloadAndStoreInR2(resultUrl, r2ObjectPath, env);

    // Update database with R2 info
    await this.updatePhoto(photo.id, {
      phase3_r2_object_path: r2ObjectPath,
      phase3_r2_url: r2Url
    }, env);

    console.log(`Phase 3 completed for photo ${photo.id}`);
  }

  private async callReplicateModel(model: string, input: any, env: any): Promise<ReplicatePrediction> {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'latest',
        input
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Replicate API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  private async pollReplicatePrediction(predictionId: string, env: any): Promise<ReplicatePrediction> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${env.REPLICATE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch prediction status: ${response.status}`);
      }

      const prediction: ReplicatePrediction = await response.json();
      
      if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
        return prediction;
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Prediction polling timeout');
  }

  private async downloadAndStoreInR2(url: string, objectPath: string, env: any): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file from ${url}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await env.R2.put(objectPath, arrayBuffer, {
      httpMetadata: {
        contentType: response.headers.get('content-type') || 'application/octet-stream',
      },
    });
  }

  private getFileExtension(url: string): string {
    const urlPath = new URL(url).pathname;
    const extension = urlPath.split('.').pop();
    return extension || 'jpg';
  }
}

export default PhotoProcessingWorkflow;
