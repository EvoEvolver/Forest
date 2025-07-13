import yaml from 'js-yaml';

export interface ApiEndpoint {
    id: string;
    path: string;
    method: string;
    summary: string;
    description?: string;
    parameters?: any[];
    requestBody?: any;
    responses: any;
    tags?: string[];
    operationId?: string;
}

export interface ApiSpec {
    info: {
        title: string;
        version: string;
        description?: string;
    };
    servers?: Array<{
        url: string;
        description?: string;
    }>;
    endpoints: ApiEndpoint[];
}

export interface ApiSpecWithRaw {
    parsed: ApiSpec;
    raw: any;
}

export async function parseApiSpec(apiUrlOrYaml: string): Promise<ApiSpec> {
    try {
        let yamlText: string;
        
        // Check if the input is a URL (starts with http://, https://, or /)
        if (apiUrlOrYaml.startsWith('http://') || apiUrlOrYaml.startsWith('https://') || apiUrlOrYaml.startsWith('/')) {
            const response = await fetch(apiUrlOrYaml);
            yamlText = await response.text();
        } else {
            // Treat as YAML string
            yamlText = apiUrlOrYaml;
        }

        const spec = yaml.load(yamlText) as any;

        const endpoints: ApiEndpoint[] = [];

        // Handle both OpenAPI 3.0 and Swagger 2.0 formats
        const paths = spec.paths || {};

        Object.entries(paths).forEach(([path, pathItem]: [string, any]) => {
            const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

            methods.forEach(method => {
                if (pathItem[method]) {
                    const operation = pathItem[method];
                    endpoints.push({
                        id: `${method.toUpperCase()}_${path.replace(/[{}]/g, '').replace(/\//g, '_')}`,
                        path,
                        method: method.toUpperCase(),
                        summary: operation.summary || `${method.toUpperCase()} ${path}`,
                        description: operation.description,
                        parameters: operation.parameters,
                        requestBody: operation.requestBody,
                        responses: operation.responses,
                        tags: operation.tags,
                        operationId: operation.operationId
                    });
                }
            });
        });

        return {
            info: {
                title: spec.info?.title || '',
                version: spec.info?.version || '',
                description: spec.info?.description
            },
            servers: spec.servers || (spec.host ? [{ url: `${spec.schemes?.[0] || 'http'}://${spec.host}${spec.basePath || ''}` }] : []),
            endpoints
        };
    } catch (error) {
        console.error('Error parsing API spec:', error);
        throw error;
    }
}

export async function parseApiSpecWithRaw(apiUrlOrYaml: string): Promise<ApiSpecWithRaw> {
    try {
        let yamlText: string;
        
        // Check if the input is a URL (starts with http://, https://, or /)
        if (apiUrlOrYaml.startsWith('http://') || apiUrlOrYaml.startsWith('https://') || apiUrlOrYaml.startsWith('/')) {
            const response = await fetch(apiUrlOrYaml);
            yamlText = await response.text();
        } else {
            // Treat as YAML string
            yamlText = apiUrlOrYaml;
        }

        const spec = yaml.load(yamlText) as any;

        const endpoints: ApiEndpoint[] = [];

        // Handle both OpenAPI 3.0 and Swagger 2.0 formats
        const paths = spec.paths || {};

        Object.entries(paths).forEach(([path, pathItem]: [string, any]) => {
            const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

            methods.forEach(method => {
                if (pathItem[method]) {
                    const operation = pathItem[method];
                    endpoints.push({
                        id: `${method.toUpperCase()}_${path.replace(/[{}]/g, '').replace(/\//g, '_')}`,
                        path,
                        method: method.toUpperCase(),
                        summary: operation.summary || `${method.toUpperCase()} ${path}`,
                        description: operation.description,
                        parameters: operation.parameters,
                        requestBody: operation.requestBody,
                        responses: operation.responses,
                        tags: operation.tags,
                        operationId: operation.operationId
                    });
                }
            });
        });

        const parsed: ApiSpec = {
            info: {
                title: spec.info?.title || 'API Documentation',
                version: spec.info?.version || '1.0.0',
                description: spec.info?.description
            },
            servers: spec.servers || (spec.host ? [{ url: `${spec.schemes?.[0] || 'http'}://${spec.host}${spec.basePath || ''}` }] : []),
            endpoints
        };

        return {
            parsed,
            raw: spec
        };
    } catch (error) {
        console.error('Error parsing API spec:', error);
        throw error;
    }
}