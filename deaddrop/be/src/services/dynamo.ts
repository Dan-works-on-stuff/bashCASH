import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config.js';
import type { Secret } from '../types.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function putSecret(secret: Secret): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: config.tableName,
      Item: secret,
    }),
  );
}

export async function getSecret(id: string): Promise<Secret | null> {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: config.tableName,
      Key: { id },
    }),
  );
  return (Item as Secret) ?? null;
}

export async function markViewed(id: string): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: config.tableName,
        Key: { id },
        UpdateExpression: 'SET viewed = :true',
        ConditionExpression: 'viewed = :false',
        ExpressionAttributeValues: {
          ':true': true,
          ':false': false,
        },
      }),
    );
    return true;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.name === 'ConditionalCheckFailedException'
    ) {
      return false;
    }
    throw err;
  }
}

export async function deleteSecret(id: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: config.tableName,
      Key: { id },
    }),
  );
}
