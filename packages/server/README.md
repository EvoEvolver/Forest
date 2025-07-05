# Forest Server 

## Components

### Configuration (`config/app.ts`)
- Centralized configuration management
- Environment variable handling
- Command-line argument support

### Services (`services/`)
- **TreeService**: Handles tree creation, duplication, deletion, and metadata operations
- **AIService**: Manages OpenAI API interactions

### Routes (`routes/`)
- **treeRoutes**: Tree CRUD operations (`/api/createTree`, `/api/duplicateTree`, etc.)
- **aiRoutes**: AI endpoints (`/api/llm`)
- **visitRoutes**: Visit tracking (`/api/recordTreeVisit`, `/api/user/visitedTrees`)

### Middleware (`middleware/`)
- **auth.ts**: Authentication and authorization
- **cors.ts**: CORS configuration
- **bodyParser.ts**: Request body parsing
- **staticFiles.ts**: Static file serving and frontend routing

### WebSocket (`websocket/`)
- **websocketHandler.ts**: WebSocket connection management and Y.js document handling