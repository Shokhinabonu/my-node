import {
    IAuthenticateGeneric,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class RouteManagerApi implements ICredentialType {
    name = 'RouteManagerApi';
    displayName = 'Route Manager API';
    documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';
    
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            default: '',
            required: true, // Make it required if necessary
            placeholder: 'Enter your API key',
        },
    ];

    authenticate = {
        type: 'generic',
        properties: {
            qs: {
                'api_key': '={{$credentials.apiKey}}' // Use the API key in the query string
            }
        },
    } as IAuthenticateGeneric;
}