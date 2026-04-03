import type { SQSHandler } from 'aws-lambda';
import { deleteSecret } from '../src/services/dynamo.js';
import { publishEvent } from '../src/services/sns.js';
import type { DeleteMessage } from '../src/types.js';

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const message: DeleteMessage = JSON.parse(record.body);
    await deleteSecret(message.secretId);
    await publishEvent(message.email, 'viewed', message.secretId);
  }
};
