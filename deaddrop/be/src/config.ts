function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  get tableName() { return requireEnv('TABLE_NAME'); },
  get queueUrl() { return requireEnv('QUEUE_URL'); },
  get kmsKeyId() { return requireEnv('KMS_KEY_ID'); },
  get bedrockModelId() { return requireEnv('BEDROCK_MODEL_ID'); },
  get snsTopicArn() { return requireEnv('SNS_TOPIC_ARN'); },
  get sesSenderEmail() { return requireEnv('SES_SENDER_EMAIL'); },
};
