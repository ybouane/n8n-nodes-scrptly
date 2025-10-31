import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';


type OutputResponse = {
	status: string;
	statusMessage?: string;
	projectUrl?: string;
	projectId?: string;
	videoUrl?: string;
	thumbnailUrl?: string;
};

export class Scrptly implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Scrptly',
		name: 'scrptly',
		icon: 'file:../../icons/scrptly.svg',
		group: ['output', 'transform'],
		version: 1,
		subtitle: 'Generate a video via Scrptly',
		description: 'Generates an AI video based on a text prompt and optional context images. Returns the video URL when done.',
		defaults: { name: 'Scrptly' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'scrptlyApi', required: true }],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: ''
			},
			{
				displayName: 'Context Images',
				name: 'context',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, maxAllowedFields: 5 },
				default: [],
				description: 'Array of images with URL and description',
				options: [
					{
						name: 'images',
						displayName: 'Images',
						values: [
							{
								displayName: 'Image URL',
								name: 'url',
								type: 'string',
								required: true,
								default: ''
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: ''
							}
						]
					}
				]
			},
			{
				displayName: 'Max Tokens to Approve',
				name: 'approveUpTo',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 10000,
				description: 'The maximum budget in tokens you are willing to approve for this video. Default is 10,000 tokens. Ensure your account has sufficient funds to cover this amount.'
			},
			{
				displayName: 'Wait For Completion',
				name: 'waitForComplete',
				type: 'boolean',
				default: true,
				description: 'Whether to wait for the video generation to complete before returning or just return the task ID'
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnItems: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const prompt = this.getNodeParameter('prompt', i) as string;
			const context = (this.getNodeParameter('context', i, {}) as { images?: Array<{ url: string; description?: string }> })?.images ?? [];
			const approveUpTo = this.getNodeParameter('approveUpTo', i, 10000) as number;
			const waitForComplete = this.getNodeParameter('waitForComplete', i, true) as boolean;

			
			// 1) Kick off generation
			const startReq: IHttpRequestOptions = {
				method: 'POST',
				url: 'https://api.scrptly.com/generateAiVideo',
				json: true,
				body: { prompt, context, approveUpTo }
			};

			const startRes = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'scrptlyApi',
				startReq
			));
			
			if(startRes.success!==true) {
				throw new NodeOperationError(this.getNode(), `Scrptly: failed to start video generation. ${startRes.error || ''}`);
			}

			const taskId = startRes.taskId;
			const statusUrl = startRes.eventsUrl;

			// 2) If not waiting, return early
			if (!waitForComplete) {
				returnItems.push({ json: { taskId, statusUrl, startResponse: startRes } });
				continue;
			}
			while (true) {
				await sleep(15_000); // poll every 15s
				const statusReq: IHttpRequestOptions = {
					method: 'GET',
					url: statusUrl,
					json: true
				};

				const task = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'scrptlyApi',
					statusReq
				));

				if (task?.status === 'failed') {
					throw new NodeOperationError(this.getNode(), `Scrptly task failed: ${task.message || 'Unknown error'}`);
				}

				if(task.status==='success') {
					const out: OutputResponse = {
						status: task.status,
						statusMessage: task.message,
						projectUrl: task.projectUrl,
						projectId: task.projectId,
					};
					out.videoUrl = task.renderInfo.output.video;
					out.thumbnailUrl = task.renderInfo.output.thumbnail;
					returnItems.push({
						json: out
					});
					break;
				} else {
					// still processing show progress
					console.log(`Scrptly task ${taskId} status: ${task.message}`);
				}
			}
		}

		return [returnItems];
	}
}