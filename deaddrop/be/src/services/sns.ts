import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { config } from '../config.js';
import type { NotificationEvent } from '../types.js';

const sns = new SNSClient({});

export async function publishEvent(
  email: string,
  event: 'viewed' | 'expired',
  secretId: string,
): Promise<void> {
  const payload: NotificationEvent = {
    email,
    event,
    secretId,
    timestamp: new Date().toISOString(),
  };
  await sns.send(
    new PublishCommand({
      TopicArn: config.snsTopicArn,
      Message: JSON.stringify(payload),
      Subject: `DeadDrop ${event}`,
    }),
  );
}
