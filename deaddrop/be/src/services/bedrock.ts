import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config.js';
import { AppError } from '../middleware/error-handler.js';

const bedrock = new BedrockRuntimeClient({});

export async function generateText(prompt: string): Promise<string> {
  try {
    const response = await bedrock.send(
      new InvokeModelCommand({
        modelId: config.bedrockModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      }),
    );

    const body = JSON.parse(new TextDecoder().decode(response.body));
    return body.content[0].text;
  } catch (err) {
    console.error('Bedrock error:', err);
    throw new AppError(502, 'BEDROCK_ERROR', 'Failed to generate text');
  }
}
