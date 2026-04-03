import type { DynamoDBStreamHandler } from 'aws-lambda';
import { publishEvent } from '../src/services/sns.js';

export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== 'REMOVE') continue;

    const oldImage = record.dynamodb?.OldImage;
    if (!oldImage) continue;

    const viewed = oldImage.viewed?.BOOL;
    if (viewed === true) continue;

    const email = oldImage.email?.S;
    const secretId = oldImage.id?.S;
    if (!email || !secretId) continue;

    await publishEvent(email, 'expired', secretId);
  }
};
