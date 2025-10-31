# n8n-nodes-scrptly
Scrptly's N8N Integration allows you to create long-form AI videos within your N8N workflows using Scrptly's powerful AI Video-Agent. By leveraging this integration, you can automate video creation processes and seamlessly incorporate AI-generated videos into your applications.

## Setting Up the N8N Integration
To set up the N8N Integration with Scrptly, follow these steps:
1. **Install the Scrptly N8N Node**: In your N8N instance, install the Scrptly node from the N8N community nodes.
	- Go to Settings > Community Nodes > Install New and type `n8n-nodes-scrptly`.
	- Click on the **Install** button to add the Scrptly node to your N8N instance.
2. **Configure the Node**: Add the Scrptly node to your workflow and configure it with your Scrptly API key. This key is required for authentication and can be obtained from your [Scrptly account page](https://scrptly.com/account).
3. **Define Video Parameters**: In the Scrptly node, specify the parameters for your AI video, including the prompt, context images, and budget.

Generating the AI Video can take some time depending on the complexity of the request. By default the node will wait for the video generation to complete before proceeding to the next step in the workflow. You can adjust this behavior in the node settings by turning off the "Wait For Completion" option, in which case the node will return immediately with the task ID.

## Credentials
When configuring the Scrptly node, you will need to set up credentials to authenticate with the Scrptly API. Follow these steps:
1. In the N8N editor, click on the **Credentials** tab.
2. Click on **New Credential** and select **Scrptly API** from the list
3. Enter your Scrptly API key in the provided field.
4. Save the credentials and select them in the Scrptly node configuration.

## Using the N8N Integration
Once the Scrptly node is configured, you can use it to generate AI videos as part of your N8N workflows. Here’s an example of how to set up a workflow that creates an AI video:
1. **Trigger Node**: Start with a trigger node (e.g., Webhook, Schedule) to initiate the workflow.
2. **Scrptly Node**: Add the Scrptly node and configure it with the desired video parameters:
	- **Prompt**: A detailed description of the video you want to create.
	- **Context Images**: Optional images to guide the video generation.
	- **Approve Up To**: The maximum budget in tokens for the video generation. (default is 10,000 tokens)
3. **Subsequent Nodes**: Add additional nodes to process the generated video, such as sending it via email, uploading it to cloud storage, or posting it on social media.

## More Information
The N8N node is a freely available and open-source community node. You can find more information about the node, including its source code and documentation, on its [GitHub repository](https://github.com/ybouane/n8n-nodes-scrptly).