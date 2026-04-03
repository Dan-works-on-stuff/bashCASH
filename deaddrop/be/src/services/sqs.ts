import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../config.js';
import type { DeleteMessage } from '../types.js';

const sqs = new SQSClient({});

export async function sendDeleteMessage(
  secretId: string,
  email: string,
): Promise<void> {
  const message: DeleteMessage = { secretId, email };
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: config.queueUrl,
      MessageBody: JSON.stringify(message),
    }),
  );
}
