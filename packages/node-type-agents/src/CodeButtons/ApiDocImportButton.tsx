import React, {useState} from "react";
import {NodeVM} from "@forest/schema";
import {
    Button,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography
} from "@mui/material";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {stageThisVersion} from "@forest/schema/src/stageService";
import pRetry from 'p-retry';
import {AgentToolNodeTypeM} from "../ToolNode";

// API Documentation Import Button Component
export const ApiDocImportButton: React.FC<{ node: NodeVM }> = ({node}) => {
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [apiDocumentation, setApiDocumentation] = useState("");
    const authToken = useAtomValue(authTokenAtom);

    const handleClick = () => {
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setApiDocumentation("");
    };

    const handleImport = async () => {
        if (!apiDocumentation.trim()) return;

        setLoading(true);
        try {
            const openApiSpec = await importApiDocumentation(apiDocumentation, authToken);

            // Stage current version before modification
            await stageThisVersion(node, "Before API documentation import");

            // Update the OpenAPI spec using proper NodeM method
            AgentToolNodeTypeM.updateApiSpec(node.nodeM, openApiSpec);

            handleCloseDialog();
        } catch (error) {
            alert("Error importing API documentation: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Card
                sx={{
                    cursor: 'pointer',
                    boxShadow: 2,
                    '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s ease-in-out',
                    mb: 2,
                    borderRadius: 2
                }}
                onClick={handleClick}
            >
                <CardContent sx={{display: 'flex', alignItems: 'center', gap: 2, py: 1.5}}>
                    <UploadFileIcon color="primary" fontSize="small"/>
                    <div>
                        <Typography variant="body2" component="div">
                            Import API Documentation
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            Convert API documentation to OpenAPI format
                        </Typography>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>Import API Documentation</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="API Documentation"
                        fullWidth
                        multiline
                        rows={15}
                        variant="outlined"
                        value={apiDocumentation}
                        onChange={(e) => setApiDocumentation(e.target.value)}
                        placeholder="Paste your API documentation here (text descriptions, curl examples, parameter tables, etc.)..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        onClick={handleImport}
                        color="primary"
                        disabled={!apiDocumentation.trim() || loading}
                    >
                        {loading ? <CircularProgress size={20}/> : "Import"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

async function importApiDocumentation(apiDocumentation: string, authToken: string): Promise<string> {
    const prompt = `You are an API documentation converter that creates simple, agent-friendly OpenAPI specifications. Your goal is to make APIs easy for AI agents to understand and use.

Convert the following API documentation to a simplified OpenAPI 3.0 JSON specification:

<api_documentation>
${apiDocumentation}
</api_documentation>

**CORE PRINCIPLES:**
1. **SIMPLICITY FIRST** - Agents need clear, simple parameter definitions
2. **FLATTEN COMPLEX STRUCTURES** - Avoid deep nesting, oneOf, additionalProperties
3. **FOCUS ON PARAMETERS** - This is what agents need to call the API
4. **MINIMAL RESPONSES** - Keep response schemas basic

**SIMPLIFICATION RULES:**
- **Complex Objects → Simple Strings**: Convert complex nested objects to simple string parameters with clear descriptions
- **Rich Text Arrays → Plain Strings**: Replace rich text arrays with simple string parameters
- **Deep Schema Objects → Flat Parameters**: Extract the essential parameters from complex schemas
- **Multiple Options → Clear Examples**: Instead of oneOf/anyOf, provide clear examples in descriptions

**Template for Complex Parameters:**
Instead of: Complex nested schema
Use: Simple parameter with rich description explaining the format

Example:
- Bad: {"type": "array", "items": {"type": "object", "properties": {...}}}
- Good: {"type": "string", "description": "JSON string containing array of objects. Example: '[{\"type\":\"text\",\"content\":\"Hello\"}]'"}

**OpenAPI Structure:**
{
  "openapi": "3.0.0",
  "info": {"title": "API Name", "version": "1.0.0", "description": "Brief description"},
  "servers": [{"url": "https://api.example.com", "description": "Production"}],
  "paths": {
    "/endpoint/{param}": {
      "method": {
        "operationId": "actionName",
        "summary": "What this does",
        "description": "Simple description with key limitations",
        "parameters": [
          {
            "name": "param",
            "in": "path/query/header",
            "description": "Clear description with examples and format info",
            "required": true/false,
            "schema": {"type": "string/number/boolean"}
          }
        ],
        "requestBody": {
          "description": "Simple description",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "description": "Request body as key-value pairs",
                "properties": {
                  "simpleParam": {
                    "type": "string",
                    "description": "What this parameter does with examples"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {"description": "Success - returns updated object"},
          "400": {"description": "Bad request"},
          "404": {"description": "Not found"}
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {"type": "http", "scheme": "bearer"}
    }
  }
}

**CRITICAL INSTRUCTIONS:**
- Extract the essential parameters agents need
- Convert complex nested structures to simple string parameters with format descriptions
- Use clear, practical examples in parameter descriptions
- Avoid deep object schemas - flatten to simple key-value pairs
- Focus on what agents need to know, not perfect API representation
- For complex body parameters, describe the expected JSON format in plain text

Return ONLY valid JSON without markdown formatting.`;

    const message = new NormalMessage({
        content: prompt,
        author: "user",
        role: "user",
    });

    return await pRetry(async () => {
        const response = await fetchChatResponse([message.toJson() as any], "gpt-4.1", authToken);
        
        if (!response || response.trim().length === 0) {
            throw new Error('Empty response from AI');
        }

        try {
            // Parse the JSON to ensure it's valid
            const parsedResponse = JSON.parse(response.trim());
            
            // Basic validation - ensure it's an OpenAPI spec
            if (!parsedResponse.openapi && !parsedResponse.swagger) {
                throw new Error('Response is not a valid OpenAPI specification');
            }
            
            // Return the formatted JSON
            return JSON.stringify(parsedResponse, null, 2);
        } catch (parseError) {
            throw new Error('Invalid JSON response from AI: ' + (parseError instanceof Error ? parseError.message : String(parseError)));
        }
    }, {
        retries: 3,
        onFailedAttempt: (error) => {
            console.warn(`API documentation import failed on attempt ${error.attemptNumber}:`, error.message);
        }
    });
}