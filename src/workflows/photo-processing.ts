import { WorkflowEntrypoint } from 'cloudflare:workers';
import Replicate from 'replicate';

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
  private replicate: Replicate;

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env);
    this.replicate = new Replicate({
      auth: env.REPLICATE_API_KEY,
    });
  }

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
      const phase1Updates = await this.processPhase1(photo);
      Object.assign(photo, phase1Updates);
      
      // Phase 2: advanced-face-swap
      console.log(`Starting Phase 2 for photo ${photoId}`);
      const phase2Updates = await this.processPhase2(photo);
      Object.assign(photo, phase2Updates);
      
      // Phase 3: hailuo-02-fast
      console.log(`Starting Phase 3 for photo ${photoId}`);
      const phase3Updates = await this.processPhase3(photo);
      Object.assign(photo, phase3Updates);
      
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

  private async processPhase1(photo: Photo): Promise<Partial<Photo>> {
    console.log(`Starting Phase 1 for photo ${photo.id}`);
    
    // Call flux-kontext-pro model
    const prediction = await this.callReplicateModel(
      'black-forest-labs/flux-kontext-pro',
      {
        prompt: "Make me a witch or wizard, Harry! Put me in front of a neutral, dark background and give me robes and a hat.",
        input_image: photo.original_r2_url
      }
    );

    // Update database with prediction
    await this.updatePhoto(photo.id, {
      phase1_replicate_prediction: prediction.id,
      phase1_replicate_url: prediction.urls?.get
    });

    // Poll until completion
    const completedPrediction = await this.pollReplicatePrediction(prediction.id);
    
    if (completedPrediction.status !== 'succeeded') {
      throw new Error(`Phase 1 failed: ${completedPrediction.error || 'Unknown error'}`);
    }

    // Download and store result in R2
    const resultUrl = completedPrediction.urls?.get;
    if (!resultUrl) {
      throw new Error('Phase 1 completed but no result URL found');
    }

    // Get the actual result URL and file extension
    const actualResultUrl = await this.getActualResultUrl(resultUrl);
    const fileExtension = this.getFileExtension(actualResultUrl);
    const r2ObjectPath = `phase1/${photo.id}.${fileExtension}`;
    const r2Url = `https://photos.demo.xianwen.dev/${r2ObjectPath}`;

    await this.downloadAndStoreInR2(resultUrl, r2ObjectPath);

    // Update database with R2 info and actual result URL
    const phase1Updates = {
      phase1_replicate_prediction: prediction.id,
      phase1_replicate_url: actualResultUrl,
      phase1_r2_object_path: r2ObjectPath,
      phase1_r2_url: r2Url
    };
    await this.updatePhoto(photo.id, phase1Updates);

    console.log(`Phase 1 completed for photo ${photo.id}`);
    
    // Return the updated fields so they can be patched into the photo object
    return phase1Updates;
  }

  private async processPhase2(photo: Photo): Promise<Partial<Photo>> {
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
      }
    );

    // Update database with prediction
    await this.updatePhoto(photo.id, {
      phase2_replicate_prediction: prediction.id,
      phase2_replicate_url: prediction.urls?.get
    });

    // Poll until completion
    const completedPrediction = await this.pollReplicatePrediction(prediction.id);
    
    if (completedPrediction.status !== 'succeeded') {
      throw new Error(`Phase 2 failed: ${completedPrediction.error || 'Unknown error'}`);
    }

    // Download and store result in R2
    const resultUrl = completedPrediction.urls?.get;
    if (!resultUrl) {
      throw new Error('Phase 2 completed but no result URL found');
    }

    // Get the actual result URL and file extension
    const actualResultUrl = await this.getActualResultUrl(resultUrl);
    const fileExtension = this.getFileExtension(actualResultUrl);
    const r2ObjectPath = `phase2/${photo.id}.${fileExtension}`;
    const r2Url = `https://photos.demo.xianwen.dev/${r2ObjectPath}`;

    await this.downloadAndStoreInR2(resultUrl, r2ObjectPath);

    // Update database with R2 info and actual result URL
    const phase2Updates = {
      phase2_replicate_prediction: prediction.id,
      phase2_replicate_url: actualResultUrl,
      phase2_r2_object_path: r2ObjectPath,
      phase2_r2_url: r2Url
    };
    await this.updatePhoto(photo.id, phase2Updates);

    console.log(`Phase 2 completed for photo ${photo.id}`);
    
    // Return the updated fields so they can be patched into the photo object
    return phase2Updates;
  }

  private async processPhase3(photo: Photo): Promise<Partial<Photo>> {
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
      }
    );

    // Update database with prediction
    await this.updatePhoto(photo.id, {
      phase3_replicate_prediction: prediction.id,
      phase3_replicate_url: prediction.urls?.get
    });

    // Poll until completion
    const completedPrediction = await this.pollReplicatePrediction(prediction.id);
    
    if (completedPrediction.status !== 'succeeded') {
      throw new Error(`Phase 3 failed: ${completedPrediction.error || 'Unknown error'}`);
    }

    // Download and store result in R2
    const resultUrl = completedPrediction.urls?.get;
    if (!resultUrl) {
      throw new Error('Phase 3 completed but no result URL found');
    }

    // Get the actual result URL and file extension
    const actualResultUrl = await this.getActualResultUrl(resultUrl);
    const fileExtension = this.getFileExtension(actualResultUrl);
    const r2ObjectPath = `phase3/${photo.id}.${fileExtension}`;
    const r2Url = `https://photos.demo.xianwen.dev/${r2ObjectPath}`;

    await this.downloadAndStoreInR2(resultUrl, r2ObjectPath);

    // Update database with R2 info and actual result URL
    const phase3Updates = {
      phase3_replicate_prediction: prediction.id,
      phase3_replicate_url: actualResultUrl,
      phase3_r2_object_path: r2ObjectPath,
      phase3_r2_url: r2Url
    };
    await this.updatePhoto(photo.id, phase3Updates);

    console.log(`Phase 3 completed for photo ${photo.id}`);
    
    // Return the updated fields so they can be patched into the photo object
    return phase3Updates;
  }

  private async callReplicateModel(model: string, input: any): Promise<ReplicatePrediction> {
    console.log(`Calling Replicate model: ${model}`);
    console.log(`Input:`, JSON.stringify(input, null, 2));
    
    try {
      const prediction = await this.replicate.predictions.create({
        model: model,
        input: input
      });

      console.log(`Replicate API call successful for model ${model}, prediction ID: ${prediction.id}`);
      return prediction as ReplicatePrediction;
    } catch (error) {
      console.error(`Failed to call Replicate model ${model}:`, error);
      throw error;
    }
  }

  private async pollReplicatePrediction(predictionId: string): Promise<ReplicatePrediction> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    console.log(`Starting to poll prediction ${predictionId}`);

    while (attempts < maxAttempts) {
      try {
        console.log(`Polling attempt ${attempts + 1}/${maxAttempts} for prediction ${predictionId}`);
        
        const prediction = await this.replicate.predictions.get(predictionId);
        console.log(`Prediction ${predictionId} status: ${prediction.status}`);
        
        if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
          console.log(`Prediction ${predictionId} completed with status: ${prediction.status}`);
          if (prediction.status === 'failed') {
            console.error(`Prediction ${predictionId} failed:`, prediction.error);
          }
          return prediction as ReplicatePrediction;
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
      // First, fetch the JSON response from the urls.get endpoint
      const jsonResponse = await fetch(url, {
        headers: {
          'Authorization': `Token ${this.env.REPLICATE_API_KEY}`,
        },
      });
      if (!jsonResponse.ok) {
        const error = `Failed to fetch prediction details from ${url}: ${jsonResponse.status} ${jsonResponse.statusText}`;
        console.error(error);
        throw new Error(error);
      }

      const predictionData = await jsonResponse.json() as any;
      console.log(`Fetched prediction data:`, JSON.stringify(predictionData, null, 2));

      // Extract the actual result URL from the output field
      const actualResultUrl = predictionData.output;
      if (!actualResultUrl) {
        throw new Error('No output URL found in prediction data');
      }

      console.log(`Actual result URL: ${actualResultUrl}`);

      // Now download the actual file from the result URL
      const fileResponse = await fetch(actualResultUrl);
      if (!fileResponse.ok) {
        const error = `Failed to download file from ${actualResultUrl}: ${fileResponse.status} ${fileResponse.statusText}`;
        console.error(error);
        throw new Error(error);
      }

      const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
      console.log(`Downloaded file, content-type: ${contentType}, size: ${fileResponse.headers.get('content-length') || 'unknown'} bytes`);

      const arrayBuffer = await fileResponse.arrayBuffer();
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

  private async getActualResultUrl(urlsGetUrl: string): Promise<string> {
    console.log(`Fetching actual result URL from: ${urlsGetUrl}`);
    
    const response = await fetch(urlsGetUrl, {
      headers: {
        'Authorization': `Token ${this.env.REPLICATE_API_KEY}`,
      },
    });
    
    if (!response.ok) {
      const error = `Failed to fetch prediction details from ${urlsGetUrl}: ${response.status} ${response.statusText}`;
      console.error(error);
      throw new Error(error);
    }

    const predictionData = await response.json() as any;
    console.log(`Fetched prediction data:`, JSON.stringify(predictionData, null, 2));

    const actualResultUrl = predictionData.output;
    if (!actualResultUrl) {
      throw new Error('No output URL found in prediction data');
    }

    console.log(`Actual result URL: ${actualResultUrl}`);
    return actualResultUrl;
  }

  private getFileExtension(url: string): string {
    const urlPath = new URL(url).pathname;
    const extension = urlPath.split('.').pop();
    return extension || 'jpg';
  }
}

export default PhotoProcessingWorkflow;
