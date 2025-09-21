import { WorkflowEntrypoint } from 'cloudflare:workers';

interface Env {
  repl_demo_2025_d1: D1Database;
  R2: R2Bucket;
  REPLICATE_API_KEY: string;
}

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

class PhotoProcessingWorkflow extends WorkflowEntrypoint<Env, PhotoProcessingInput> {
  async run(event: any, step: any): Promise<void> {
    // Extract photoId from the payload
    const { payload } = event;
    
    if (!payload) {
      const error = 'Workflow event payload is undefined';
      console.error(error);
      throw new Error(error);
    }
    
    const { photoId } = payload as PhotoProcessingInput;
    
    if (!photoId) {
      const error = 'photoId is required but not provided in workflow payload';
      console.error(error);
      throw new Error(error);
    }
    
    if (!this.env.REPLICATE_API_KEY) {
      const error = 'REPLICATE_API_KEY is required but not provided in environment';
      console.error(error);
      throw new Error(error);
    }
            
    console.log(`Starting photo processing workflow for photo ID: ${photoId}`);
    
    try {   
      // Fetch photo from database
      console.log(`Fetching photo ${photoId} from database...`);
      const photo = await this.fetchPhoto(photoId);
      if (!photo) {
        const error = `Photo with ID ${photoId} not found`;
        console.error(error);
        throw new Error(error);
      }
      console.log(`Photo found: ${photo.original_r2_url}`);

      // Phase 1: flux-kontext-pro
      console.log(`Starting Phase 1 for photo ${photoId}`);
      await this.processPhase1(photo);
      
      // Phase 2: advanced-face-swap
      console.log(`Starting Phase 2 for photo ${photoId}`);
      await this.processPhase2(photo);
      
      // Phase 3: hailuo-02-fast
      console.log(`Starting Phase 3 for photo ${photoId}`);
      await this.processPhase3(photo);
      
      console.log(`Photo processing workflow completed successfully for photo ${photoId}`);
      
    } catch (error) {
      console.error(`Photo processing workflow failed for photo ${photoId}:`, error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        photoId
      });
      throw error;
    }
  }

  private async fetchPhoto(photoId: number): Promise<Photo | null> {
    const result = await this.env.repl_demo_2025_d1.prepare(
      'SELECT * FROM Photos WHERE id = ?'
    ).bind(photoId).first();
    
    return result as Photo | null;
  }

  private async updatePhoto(photoId: number, updates: Partial<Photo>): Promise<void> {
    const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(photoId);
    
    await this.env.repl_demo_2025_d1.prepare(
      `UPDATE Photos SET ${updateFields}, update_timestamp = datetime("now") WHERE id = ?`
    ).bind(...values).run();
  }

  private async processPhase1(photo: Photo): Promise<void> {
    console.log(`Starting Phase 1 for photo ${photo.id}`);
    
    // Call flux-kontext-pro model
    const prediction = await this.callReplicateModel(
      'black-forest-labs/flux-kontext-pro',
      {
        prompt: "Make me a wizard, Harry! Put me in front of a neutral, dark background.",
        input_image: photo.original_r2_url
      },
      this.env.REPLICATE_API_KEY
    );

    // Update database with prediction
    await this.updatePhoto(photo.id, {
      phase1_replicate_prediction: prediction.id,
      phase1_replicate_url: prediction.urls?.get
    });

    // Poll until completion
    const completedPrediction = await this.pollReplicatePrediction(prediction.id, this.env.REPLICATE_API_KEY);
    
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

    await this.downloadAndStoreInR2(resultUrl, r2ObjectPath);

    // Update database with R2 info
    await this.updatePhoto(photo.id, {
      phase1_r2_object_path: r2ObjectPath,
      phase1_r2_url: r2Url
    });

    console.log(`Phase 1 completed for photo ${photo.id}`);
  }

  private async processPhase2(photo: Photo): Promise<void> {
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
      this.env.REPLICATE_API_KEY
    );

    // Update database with prediction
    await this.updatePhoto(photo.id, {
      phase2_replicate_prediction: prediction.id,
      phase2_replicate_url: prediction.urls?.get
    });

    // Poll until completion
    const completedPrediction = await this.pollReplicatePrediction(prediction.id, this.env.REPLICATE_API_KEY);
    
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

    await this.downloadAndStoreInR2(resultUrl, r2ObjectPath);

    // Update database with R2 info
    await this.updatePhoto(photo.id, {
      phase2_r2_object_path: r2ObjectPath,
      phase2_r2_url: r2Url
    });

    console.log(`Phase 2 completed for photo ${photo.id}`);
  }

  private async processPhase3(photo: Photo): Promise<void> {
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
      this.env.REPLICATE_API_KEY
    );

    // Update database with prediction
    await this.updatePhoto(photo.id, {
      phase3_replicate_prediction: prediction.id,
      phase3_replicate_url: prediction.urls?.get
    });

    // Poll until completion
    const completedPrediction = await this.pollReplicatePrediction(prediction.id, this.env.REPLICATE_API_KEY);
    
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

    await this.downloadAndStoreInR2(resultUrl, r2ObjectPath);

    // Update database with R2 info
    await this.updatePhoto(photo.id, {
      phase3_r2_object_path: r2ObjectPath,
      phase3_r2_url: r2Url
    });

    console.log(`Phase 3 completed for photo ${photo.id}`);
  }

  private async callReplicateModel(model: string, input: any, replicateApiKey: string): Promise<ReplicatePrediction> {
    console.log(`Calling Replicate model: ${model}`);
    console.log(`Input:`, JSON.stringify(input, null, 2));
    
    if (!replicateApiKey) {
      const error = 'replicateApiKey is required but not provided';
      console.error(error);
      throw new Error(error);
    }
    
    try {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${replicateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'latest',
          input
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = `Replicate API error: ${response.status} ${errorText}`;
        console.error(error);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        throw new Error(error);
      }

      const result = await response.json() as ReplicatePrediction;
      console.log(`Replicate API call successful for model ${model}, prediction ID: ${result.id}`);
      return result;
    } catch (error) {
      console.error(`Failed to call Replicate model ${model}:`, error);
      throw error;
    }
  }

  private async pollReplicatePrediction(predictionId: string, replicateApiKey: string): Promise<ReplicatePrediction> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    console.log(`Starting to poll prediction ${predictionId}`);

    while (attempts < maxAttempts) {
      try {
        console.log(`Polling attempt ${attempts + 1}/${maxAttempts} for prediction ${predictionId}`);
        
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
          headers: {
            'Authorization': `Token ${replicateApiKey}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          const error = `Failed to fetch prediction status: ${response.status} ${errorText}`;
          console.error(error);
          throw new Error(error);
        }

        const prediction: ReplicatePrediction = await response.json();
        console.log(`Prediction ${predictionId} status: ${prediction.status}`);
        
        if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
          console.log(`Prediction ${predictionId} completed with status: ${prediction.status}`);
          if (prediction.status === 'failed') {
            console.error(`Prediction ${predictionId} failed:`, prediction.error);
          }
          return prediction;
        }

        // Wait 5 seconds before next poll
        console.log(`Waiting 5 seconds before next poll...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        console.error(`Error polling prediction ${predictionId} (attempt ${attempts + 1}):`, error);
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    }

    const error = `Prediction polling timeout after ${maxAttempts} attempts`;
    console.error(error);
    throw new Error(error);
  }

  private async downloadAndStoreInR2(url: string, objectPath: string): Promise<void> {
    console.log(`Downloading file from ${url} to R2 path: ${objectPath}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const error = `Failed to download file from ${url}: ${response.status} ${response.statusText}`;
        console.error(error);
        throw new Error(error);
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      console.log(`Downloaded file, content-type: ${contentType}, size: ${response.headers.get('content-length') || 'unknown'} bytes`);

      const arrayBuffer = await response.arrayBuffer();
      console.log(`Downloaded ${arrayBuffer.byteLength} bytes, uploading to R2...`);
      
      await this.env.R2.put(objectPath, arrayBuffer, {
        httpMetadata: {
          contentType: contentType,
        },
      });
      
      console.log(`Successfully stored file in R2: ${objectPath}`);
    } catch (error) {
      console.error(`Failed to download and store file from ${url} to ${objectPath}:`, error);
      throw error;
    }
  }

  private getFileExtension(url: string): string {
    const urlPath = new URL(url).pathname;
    const extension = urlPath.split('.').pop();
    return extension || 'jpg';
  }
}

export default PhotoProcessingWorkflow;
