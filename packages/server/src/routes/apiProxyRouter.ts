import {Request, Response, Router} from 'express';
import axios from 'axios';

const apiProxyRouter = Router();
// @ts-ignore
apiProxyRouter.post('/fetch', async (req: Request, res: Response) => {
    const {serverAddress, method, requestBody} = req.body;
    console.log(`Proxying request to ${serverAddress} with method ${method}`, JSON.stringify(requestBody));
    if (!serverAddress) {
        return res.status(400).json({error: 'serverAddress is required'});
    }
    if (!method || !['GET', 'POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
        return res.status(400).json({error: 'Invalid or missing method'});
    }

    try {
        const response = await axios({
            url: serverAddress,
            method: method.toLowerCase(),
            data: requestBody,
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