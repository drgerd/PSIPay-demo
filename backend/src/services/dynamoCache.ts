import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

type CacheGetResult<T> =
  | { hit: true; value: T; ttlEpoch?: number }
  | { hit: false };

type CachedFetchResult<T> = { value: T; stale: boolean };

const VALUE_ATTR = "valueJson";

let _ddbDoc: DynamoDBDocumentClient | null = null;
let _ddbClient: DynamoDBClient | null = null;

function ddbDoc(): DynamoDBDocumentClient {
  if (_ddbDoc) return _ddbDoc;

  const region = process.env.AWS_REGION || "eu-central-1";
  const endpoint = process.env.DYNAMODB_ENDPOINT;

  const client = new DynamoDBClient({
    region,
    ...(endpoint ? { endpoint } : {}),
  });
  _ddbClient = client;

  _ddbDoc = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return _ddbDoc;
}

async function ensureLocalTableExists(tableName: string): Promise<void> {
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  if (!endpoint) return;

  // Ensure clients are initialized.
  ddbDoc();
  const client = _ddbClient;
  if (!client) return;

  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return;
  } catch {
    // fall through and attempt create
  }

  try {
    await client.send(
      new CreateTableCommand({
        TableName: tableName,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [{ AttributeName: "cacheKey", AttributeType: "S" }],
        KeySchema: [{ AttributeName: "cacheKey", KeyType: "HASH" }],
      })
    );
  } catch (err) {
    if (err instanceof ResourceInUseException) return;
    throw err;
  }
}

function tableName(): string {
  // Cache is only enabled when explicitly configured.
  return String(process.env.CACHE_TABLE_NAME || "").trim();
}

async function cacheGet<T>(cacheKey: string): Promise<CacheGetResult<T>> {
  const TableName = tableName();
  if (!TableName) return { hit: false };
  await ensureLocalTableExists(TableName);

  const res = await ddbDoc().send(
    new GetCommand({
      TableName,
      Key: { cacheKey },
      ConsistentRead: false,
    })
  );

  const item = res.Item as Record<string, unknown> | undefined;
  const raw = item?.[VALUE_ATTR];
  if (!item || typeof raw !== "string") return { hit: false };

  const ttlEpoch = typeof item.ttlEpoch === "number" ? item.ttlEpoch : undefined;
  return { hit: true, value: JSON.parse(raw) as T, ttlEpoch };
}

async function cachePut(cacheKey: string, value: unknown, ttlSeconds: number): Promise<void> {
  const TableName = tableName();
  if (!TableName) return;
  await ensureLocalTableExists(TableName);

  const now = Math.floor(Date.now() / 1000);
  const ttlEpoch = now + Math.max(1, ttlSeconds);
  await ddbDoc().send(
    new PutCommand({
      TableName,
      Item: {
        cacheKey,
        [VALUE_ATTR]: JSON.stringify(value),
        createdAt: new Date().toISOString(),
        ttlEpoch,
      },
    })
  );
}

export async function cachedFetchJson<T>(args: {
  cacheKey: string;
  ttlSeconds: number;
  skipCache?: boolean;
  fetchFresh: () => Promise<T>;
}): Promise<CachedFetchResult<T>> {
  const { cacheKey, ttlSeconds, skipCache = false, fetchFresh } = args;

  if (!skipCache) {
    try {
      const hit = await cacheGet<T>(cacheKey);
      if (hit.hit) return { value: hit.value, stale: false };
    } catch {
      // Cache read failures should not break the request.
    }
  }

  try {
    const fresh = await fetchFresh();
    try {
      await cachePut(cacheKey, fresh, ttlSeconds);
    } catch {
      // Ignore cache write failures.
    }
    return { value: fresh, stale: false };
  } catch (err) {
    if (skipCache) throw err;

    // Upstream failure: attempt stale fallback.
    try {
      const hit = await cacheGet<T>(cacheKey);
      if (hit.hit) return { value: hit.value, stale: true };
    } catch {
      // ignore
    }
    throw err;
  }
}
