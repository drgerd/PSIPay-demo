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
const DEFAULT_CACHE_TABLE_NAME = "Cache";

let _ddbDoc: DynamoDBDocumentClient | null = null;
let _ddbClient: DynamoDBClient | null = null;
const _ensuredTables = new Set<string>();
let _cacheReadWarned = false;
let _cacheWriteWarned = false;

function resolveDynamoEndpoint(): string | undefined {
  const explicit = String(process.env.DYNAMODB_ENDPOINT || "").trim();
  if (explicit) {
    if (process.env.AWS_SAM_LOCAL === "true") {
      const normalized = explicit.toLowerCase();
      if (normalized.includes("127.0.0.1") || normalized.includes("localhost")) {
        return "http://dynamodb-local:8000";
      }
    }
    return explicit;
  }
  if (process.env.AWS_SAM_LOCAL === "true") {
    // Prefer same-network container DNS, fall back to host gateway.
    return "http://dynamodb-local:8000";
  }
  return undefined;
}

function ddbDoc(): DynamoDBDocumentClient {
  if (_ddbDoc) return _ddbDoc;

  const region = process.env.AWS_REGION || "eu-central-1";
  const endpoint = resolveDynamoEndpoint();

  const client = new DynamoDBClient({
    region,
    ...(endpoint
      ? {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
            ...(process.env.AWS_SESSION_TOKEN
              ? { sessionToken: process.env.AWS_SESSION_TOKEN }
              : {}),
          },
        }
      : {}),
    ...(endpoint ? { endpoint } : {}),
  });
  _ddbClient = client;

  _ddbDoc = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return _ddbDoc;
}

async function ensureLocalTableExists(tableName: string): Promise<void> {
  const endpoint = resolveDynamoEndpoint();
  if (!endpoint) return;
  if (_ensuredTables.has(tableName)) return;

  // Ensure clients are initialized.
  ddbDoc();
  const client = _ddbClient;
  if (!client) return;

  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    _ensuredTables.add(tableName);
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
    _ensuredTables.add(tableName);
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      _ensuredTables.add(tableName);
      return;
    }
    throw err;
  }
}

function tableName(): string {
  return String(process.env.CACHE_TABLE_NAME || DEFAULT_CACHE_TABLE_NAME).trim();
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
  fetchFresh: () => Promise<T>;
}): Promise<CachedFetchResult<T>> {
  const { cacheKey, ttlSeconds, fetchFresh } = args;

  try {
    const hit = await cacheGet<T>(cacheKey);
    if (hit.hit) {
      return { value: hit.value, stale: false };
    }
  } catch (err) {
    // Cache read failures should not break the request.
    if (!_cacheReadWarned) {
      _cacheReadWarned = true;
      console.warn(`[cache] read failure: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    const fresh = await fetchFresh();
    try {
      await cachePut(cacheKey, fresh, ttlSeconds);
    } catch (err) {
      // Ignore cache write failures.
      if (!_cacheWriteWarned) {
        _cacheWriteWarned = true;
        console.warn(`[cache] write failure: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { value: fresh, stale: false };
  } catch (err) {
    // Upstream failure: attempt stale fallback.
    try {
      const hit = await cacheGet<T>(cacheKey);
      if (hit.hit) {
        return { value: hit.value, stale: true };
      }
    } catch {
      // ignore
    }
    throw err;
  }
}
