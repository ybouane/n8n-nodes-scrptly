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
	resultVideoUrl?: string;
	resultVideoThumbnail?: string;
};

export class Scrptly implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Scrptly',
		name: 'scrptly',
		icon: 'file:../../icons/scrptly.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Generate video via Scrptly',
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
				description: 'Whether to wait for the video generation to complete before returning or just return the task ID'
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
			const startReq: IHttpRequestOptions = {
				method: 'POST',
				url: 'https://api.scrptly.com/generateAiVideo',
				json: true,
				body: { prompt, contextImages, approveUpTo }
			};

			const startRes = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'scrptlyApi',
				startReq
			));

			if (!startRes?.taskId) {
				throw new NodeOperationError(this.getNode(), 'Scrptly: missing taskId in start response.');
			}

			const taskId = startRes.taskId;
			const statusUrl = `https://scrptly.com/task-status/${encodeURIComponent(taskId)}`;

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