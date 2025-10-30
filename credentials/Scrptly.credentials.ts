import type {
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ScrptlyApi implements ICredentialType {
	name = 'scrptlyApi';
	displayName = 'Scrptly API';
	icon: Icon = 'file:../icons/scrptly.png';
	documentationUrl = 'https://scrptly.com/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Scrptly API key (sent as Bearer token).'
		}
	];

	authenticate = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.apiKey}}'
			}
		}
	} as const;

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: 'https://api.scrptly.com/info',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'success',
					value: false,
					message: 'Could not authenticate with the provided credentials.',
				}
			}
		]
	};
}
