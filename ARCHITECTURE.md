# Architecture Diagram

This document contains a mermaid diagram illustrating the architecture of the "Make Me A Wizard" application.

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        User[User Browser]
        Admin[Admin Browser]
    end

    subgraph "Cloudflare Workers"
        Worker[Main Worker<br/>index.ts]
        
        subgraph "Pages"
            MainPage[Main Page<br/>Gallery & Upload]
            AdminPage[Admin Page<br/>Photo Management]
        end
        
        subgraph "API Endpoints"
            UploadAPI[POST /api/upload]
            ProcessAPI[POST /api/photos/:id/process]
            StatusAPI[GET /api/photos/:id/status]
            BrowseAPI[GET /api/browse]
            PhotosAPI[GET /api/photos]
            ConfigAPI[/api/config]
        end
    end

    subgraph "Cloudflare Workflows"
        Workflow[PhotoProcessingWorkflow]
        
        subgraph "Processing Phases"
            Phase1[Phase 1: flux-kontext-pro<br/>Generate wizard costume]
            Phase2[Phase 2: advanced-face-swap<br/>Swap face with original]
            Phase3[Phase 3: hailuo-02-fast<br/>Create animated video]
        end
    end

    subgraph "Cloudflare R2"
        R2[R2 Bucket: repl-demo-2025]
        
        subgraph "R2 Storage"
            OriginalImages[uploads/*<br/>Original Photos]
            Phase1Results[phase1/*<br/>Phase 1 Results]
            Phase2Results[phase2/*<br/>Phase 2 Results]
            Phase3Results[phase3/*<br/>Phase 3 Videos]
        end
    end

    subgraph "Cloudflare D1"
        D1[D1 Database: repl-demo-2025-d1]
        PhotosTable[(Photos Table<br/>- Metadata<br/>- URLs<br/>- Status<br/>- Prediction IDs)]
    end

    subgraph "Cloudflare KV"
        KV[KV Namespace: KV]
        ConfigStore[Config Storage<br/>auto-approve setting]
    end

    subgraph "External Services"
        Replicate[Replicate API<br/>AI Model Inference]
    end

    %% User Interactions
    User -->|1. Browse Gallery| Worker
    User -->|2. Upload Photo| Worker
    Admin -->|Manage Photos & Config| Worker

    %% Worker Routing
    Worker -->|Serve UI| MainPage
    Worker -->|Serve UI| AdminPage
    Worker -->|Route API Calls| UploadAPI
    Worker -->|Route API Calls| ProcessAPI
    Worker -->|Route API Calls| StatusAPI
    Worker -->|Route API Calls| BrowseAPI
    Worker -->|Route API Calls| PhotosAPI
    Worker -->|Route API Calls| ConfigAPI

    %% Upload Flow
    UploadAPI -->|Store Image| R2
    UploadAPI -->|Save Metadata| D1
    R2 -->|Store| OriginalImages
    UploadAPI -->|Return Photo ID| User

    %% Process Flow
    ProcessAPI -->|Check Photo Exists| D1
    ProcessAPI -->|Start Workflow| Workflow
    ProcessAPI -->|Return Workflow ID| User

    %% Workflow Execution
    Workflow -->|Read Photo Data| D1
    Workflow -->|Execute| Phase1
    Phase1 -->|Call Model| Replicate
    Phase1 -->|Update Status| D1
    Phase1 -->|Store Result| Phase1Results
    
    Phase1 -->|Trigger| Phase2
    Phase2 -->|Call Model| Replicate
    Phase2 -->|Update Status| D1
    Phase2 -->|Store Result| Phase2Results
    
    Phase2 -->|Trigger| Phase3
    Phase3 -->|Call Model| Replicate
    Phase3 -->|Update Status| D1
    Phase3 -->|Store Result| Phase3Results

    %% Status Polling
    StatusAPI -->|Query Status| D1
    StatusAPI -->|Return Progress| User

    %% Browse Gallery
    BrowseAPI -->|Query Completed Photos| D1
    BrowseAPI -->|Return Video URLs| User
    User -->|Load Videos| R2

    %% Admin Functions
    PhotosAPI -->|List All Photos| D1
    PhotosAPI -->|Return Data| Admin
    ConfigAPI -->|Read/Write| KV
    ConfigAPI -->|Return Config| Admin

    %% Styling
    classDef workerStyle fill:#f96,stroke:#333,stroke-width:2px
    classDef storageStyle fill:#9cf,stroke:#333,stroke-width:2px
    classDef workflowStyle fill:#fc9,stroke:#333,stroke-width:2px
    classDef externalStyle fill:#9f9,stroke:#333,stroke-width:2px
    
    class Worker,MainPage,AdminPage,UploadAPI,ProcessAPI,StatusAPI,BrowseAPI,PhotosAPI,ConfigAPI workerStyle
    class R2,D1,KV,OriginalImages,Phase1Results,Phase2Results,Phase3Results,PhotosTable,ConfigStore storageStyle
    class Workflow,Phase1,Phase2,Phase3 workflowStyle
    class Replicate externalStyle
```

## Data Flow Description

### 1. Photo Upload Flow
1. User uploads a photo through the main page
2. Worker receives the photo via `/api/upload` endpoint
3. Worker stores the original image in R2 bucket (`uploads/*`)
4. Worker saves photo metadata in D1 database
5. Worker automatically triggers the photo processing workflow
6. Returns photo ID and workflow ID to user

### 2. Photo Processing Workflow
1. Workflow is triggered via `/api/photos/:id/process` endpoint
2. Workflow reads photo data from D1 database
3. **Phase 1**: Calls Replicate's `flux-kontext-pro` model to generate wizard costume
   - Updates D1 with prediction ID and status
   - Downloads result and stores in R2 (`phase1/*`)
4. **Phase 2**: Calls Replicate's `advanced-face-swap` model to swap face
   - Uses Phase 1 result and original photo
   - Updates D1 and stores result in R2 (`phase2/*`)
5. **Phase 3**: Calls Replicate's `hailuo-02-fast` model to create animated video
   - Uses Phase 2 result
   - Updates D1 and stores final video in R2 (`phase3/*`)

### 3. Status Polling
1. Client polls `/api/photos/:id/status` endpoint
2. Worker queries D1 for current processing status
3. Returns progress percentage and completed phases
4. Client continues polling until processing is complete

### 4. Gallery Browsing
1. Main page loads completed videos via `/api/browse` endpoint
2. Worker queries D1 for photos with `phase3_r2_url` not null, `is_public=true`, and `is_moderated=false`
3. Returns list of video URLs
4. Browser loads videos directly from R2 bucket

### 5. Admin Management
1. Admin page accesses `/api/photos` to list all photos
2. Admin can update photo visibility (`is_public`, `is_moderated`)
3. Admin can configure settings via `/api/config` which stores in KV
4. Admin can manually trigger processing for specific photos

## Cloudflare Services Used

### 1. Cloudflare Workers
- Main application runtime
- Handles HTTP routing and API endpoints
- Serves static HTML pages
- Coordinates between different services

### 2. Cloudflare Workflows
- Orchestrates long-running photo processing tasks
- Manages three-phase AI model pipeline
- Handles polling and error recovery
- Maintains state between phases

### 3. Cloudflare R2
- Object storage for images and videos
- Stores original uploads
- Stores intermediate processing results
- Stores final video outputs
- Provides public URLs for content delivery

### 4. Cloudflare D1
- SQLite database for structured data
- Stores photo metadata
- Tracks processing status
- Stores Replicate prediction IDs
- Manages visibility flags

### 5. Cloudflare KV
- Key-value store for configuration
- Stores application settings
- Fast read access for config data

## External Dependencies

### Replicate API
- Provides AI model inference
- Three models used:
  1. `black-forest-labs/flux-kontext-pro` - Image generation
  2. `easel/advanced-face-swap` - Face swapping
  3. `minimax/hailuo-02-fast` - Video generation