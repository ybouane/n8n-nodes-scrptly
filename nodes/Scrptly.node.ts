import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class Scrptly implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Scrptly',
		name: 'scrptly',
		icon: 'file:../icons/scrptly.png',
		group: ['transform'],
		version: 1,
		subtitle: 'Generate video via Scrptly',
		description: 'Generates an AI video based on a text prompt and optional context images. Returns the video URL when done.',
		defaults: { name: 'Scrptly' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'scrptlyApi', required: true }],
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
				name: 'contextImages',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
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
				displayName: 'Approve Up To',
				name: 'approveUpTo',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 10000,
				description: 'Maximum amount to approve'
			},
			{
				displayName: 'Wait For Completion',
				name: 'waitForComplete',
				type: 'boolean',
				default: true,
				description: 'If disabled, node returns only taskId and statusUrl'
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnItems: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const prompt = this.getNodeParameter('prompt', i) as string;
			const contextImages = this.getNodeParameter('contextImages', i, {}) as { images?: Array<{ url: string; description?: string }> }  ?? [];
			const approveUpTo = this.getNodeParameter('approveUpTo', i, 10000) as number;
			const waitForComplete = this.getNodeParameter('waitForComplete', i, true) as boolean;

			
			// 1) Kick off generation
			const startReq = {
				method: 'POST',
				url: 'https://api.scrptly.com/generateAiVideo',
				json: true,
				body: { prompt, contextImages, approveUpTo }
			};

			const startRes = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'scrptlyApi',
				startReq as any
			));

			if (!startRes?.taskId) {
				throw new Error('Scrptly: missing taskId in start response.');
			}

			const taskId = startRes.taskId;
			const statusUrl = `https://scrptly.com/task-status/${encodeURIComponent(taskId)}`;

			// 2) If not waiting, return early
			if (!waitForComplete) {
				returnItems.push({ json: { taskId, statusUrl, startResponse: startRes } });
				continue;
			}
			while (true) {
				delay(15_000); // poll every 15s
				const statusReq = {
					method: 'GET',
					url: statusUrl,
					json: true
				};

				const task = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'scrptlyApi',
					statusReq as any
				));

				if (task?.status === 'failed') {
					throw new Error(`Scrptly task failed: ${task.message || 'Unknown error'}`);
				}

				if(task.status==='success') {
					const out = {
						status: task.status,
						statusMessage: task.message,
						projectUrl: task.projectUrl,
						projectId: task.projectId,
					} as any;
					out.resultVideoUrl = task.renderInfo.output.video;
					out.resultVideoThumbnail = task.renderInfo.output.thumbnail;
					returnItems.push({
						json: out
					});
				} else {
					// still processing show progress
					console.log(`Scrptly task ${taskId} status: ${task.message}`);
				}
			}
		}

		return [returnItems];
	}
}