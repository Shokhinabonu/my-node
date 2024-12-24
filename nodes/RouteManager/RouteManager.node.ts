import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import axios from 'axios';

export class RouteManager implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Route Manager',
        name: 'RouteManager',
        icon: 'file:routemanager.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Manage routes using Route Manager API',
        defaults: {
            name: 'Route Manager',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'RouteManagerApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Pick Up Location',
                name: 'pickupLocation',
                type: 'string',
                default: '',
                placeholder: 'Merrifield, VA',
                required: true,
            },
            {
                displayName: 'Destination Location',
                name: 'destinationLocation',
                type: 'string',
                default: '',
                placeholder: 'Atlanta, GA',
                required: true,
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Generate Routes',
                        value: 'generateRoutes',
                        action: 'Generate truck suitable routes',
                    },
                ],
                default: 'generateRoutes',
            },
        ],
    };
    
 

    async fetchWeatherHistory(location: string, startDate: string, endDate: string): Promise<string> {
        const openAiApiKey = 'YOUR_OPENAI_API_KEY'; // Replace with your actual OpenAI API Key
        const prompt = `Generate a sample weather history for ${location} from ${startDate} to ${endDate}. Include daily records with the following details: date, temperature (high and low), humidity, precipitation, and general weather conditions.`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
        }, {
            headers: {
                'Authorization': `Bearer ${openAiApiKey}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data.choices[0].message.content; // Return the generated weather history
    }


    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        
        const items = this.getInputData();
        const routesData: any[] = []; // Array to hold route data

    
        for (let i = 0; i < items.length; i++) {
            const pickupLocation = this.getNodeParameter('pickupLocation', i) as string;
            const destinationLocation = this.getNodeParameter('destinationLocation', i) as string;
            const credentials = await this.getCredentials('RouteManagerApi');
            const apiKey = credentials.apiKey;
    
            // Fetch route information
            const hereUrl = `https://router.hereapi.com/v8/routes?origin=${pickupLocation}&destination=${destinationLocation}&apiKey=${apiKey}`;
            const routeResponse = await axios.get(hereUrl);
            const generatedRoutes = routeResponse.data.routes;
    
            for (const route of generatedRoutes) {
                // Fetch weather history for the pickup location
                const weatherHistory = await this.fetchWeatherHistory(pickupLocation, '2023-12-01', '2023-12-07');    
                // Fetch elevation data for the route
                const elevationUrl = `https://api.here.com/v8/elevations?waypoints=${route.waypoints.join('|')}&apiKey=${apiKey}`;
                const elevationResponse = await axios.get(elevationUrl);
                const elevationData = elevationResponse.data;
    
                // Assuming toll data is available in the route response
                const tollData = route.tolls; // Adjust based on actual response structure
    
                // Prepare structured data for ranking
                routesData.push({
                    route,
                    weatherHistory,
                    elevationData,
                    tollData,
                });
            }
        }
    
        // Stack rank the routes based on your criteria (e.g., lowest tolls)
        const rankedRoutes = routesData.sort((a, b) => {
            return (a.tollData.total - b.tollData.total); // Example: sort by total toll cost
        });
    
        // Structure the output to include ranked routes
        for (let j = 0; j < rankedRoutes.length; j++) {
            items[j].json.route = rankedRoutes[j].route;
            items[j].json.weatherHistory = rankedRoutes[j].weatherHistory;
            items[j].json.elevationData = rankedRoutes[j].elevationData;
            items[j].json.tollData = rankedRoutes[j].tollData;
        }
    
        return this.prepareOutputData(items); // Return the modified items



    }


}