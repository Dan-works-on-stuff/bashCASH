import type { SNSHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { NotificationEvent } from '../src/types.js';

const ses = new SESClient({});
const senderEmail = process.env.SES_SENDER_EMAIL!;

export const handler: SNSHandler = async (event) => {
  for (const record of event.Records) {
    const payload: NotificationEvent = JSON.parse(record.Sns.Message);

    const isViewed = payload.event === 'viewed';
    const subject = isViewed
      ? 'Your Dead Drop was opened'
      : 'Your Dead Drop expired';
    const body = isViewed
      ? `Your secret (ID: ${payload.secretId}) was viewed and permanently destroyed at ${payload.timestamp}.`
      : `Your secret (ID: ${payload.secretId}) expired without being viewed and was permanently deleted at ${payload.timestamp}.`;

    await ses.send(
      new SendEmailCommand({
        Source: senderEmail,
        Destination: { ToAddresses: [payload.email] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: body } },
        },
      }),
    );
  }
};
