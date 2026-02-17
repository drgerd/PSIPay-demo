gerd@DESKTOP-BHTAS78:/mnt/c/Windows/system32$ AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy AWS_REGION=eu-central-1 aws dynamodb describe-table --table-name Cache --endpoint-url http://127.0.0.1:8000
{
    "Table": {
        "AttributeDefinitions": [
            {
                "AttributeName": "cacheKey",
                "AttributeType": "S"
            }
        ],
        "TableName": "Cache",
        "KeySchema": [
            {
                "AttributeName": "cacheKey",
                "KeyType": "HASH"
            }
        ],
        "TableStatus": "ACTIVE",
        "CreationDateTime": "2026-02-17T00:04:01.534000+01:00",
        "ProvisionedThroughput": {
            "LastIncreaseDateTime": "1970-01-01T01:00:00+01:00",
            "LastDecreaseDateTime": "1970-01-01T01:00:00+01:00",
            "NumberOfDecreasesToday": 0,
            "ReadCapacityUnits": 0,
            "WriteCapacityUnits": 0
        },
        "TableSizeBytes": 105,
        "ItemCount": 1,
        "TableArn": "arn:aws:dynamodb:ddblocal:000000000000:table/Cache",
        "BillingModeSummary": {
            "BillingMode": "PAY_PER_REQUEST",
            "LastUpdateToPayPerRequestDateTime": "2026-02-17T00:04:01.534000+01:00"
        },
        "DeletionProtectionEnabled": false
    }
}