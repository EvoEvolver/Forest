import {Request, Response, Router} from 'express';
import axios from 'axios';

const apiProxyRouter = Router();
// @ts-ignore
apiProxyRouter.post('/fetch', async (req: Request, res: Response) => {
    const {serverAddress, method, requestBody, bearerToken, headers: customHeaders} = req.body;
    console.log(`Proxying request to ${serverAddress} with method ${method}`, JSON.stringify(requestBody));
    
    if (!serverAddress) {
        return res.status(400).json({error: 'serverAddress is required'});
    }
    if (!method || !['GET', 'POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
        return res.status(400).json({error: 'Invalid or missing method'});
    }
    
    // Validate bearerToken if provided
    if (bearerToken !== undefined && typeof bearerToken !== 'string') {
        return res.status(400).json({error: 'bearerToken must be a string if provided'});
    }

    // Validate customHeaders if provided
    if (customHeaders !== undefined && (typeof customHeaders !== 'object' || Array.isArray(customHeaders))) {
        return res.status(400).json({error: 'headers must be an object if provided'});
    }

    try {
        // Prepare headers object
        const headers: Record<string, string> = {};
        
        // Add custom headers if provided
        if (customHeaders && typeof customHeaders === 'object') {
            Object.entries(customHeaders).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    headers[key] = value;
                }
            });
        }
        
        // Add Authorization header if bearer token is provided and not empty
        if (bearerToken && bearerToken.trim() !== '') {
            headers.Authorization = `Bearer ${bearerToken}`;
        }

        const response = await axios({
            url: serverAddress,
            method: method.toLowerCase(),
            data: requestBody,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
        });

        res.json(response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            res.status(error.response?.status || 500).json(error.response?.data || {error: 'An unknown error occurred'});
        } else {
            res.status(500).json({error: 'An unexpected error occurred'});
        }
    }
});
export default apiProxyRouter;