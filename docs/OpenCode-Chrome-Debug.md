# OpenCode Chrome Debug (MCP)

This repo includes `mcp.json` with a Chrome DevTools MCP server:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

## Usage

1) Start client app:

```
cd client
npm run dev
```

2) Ensure OpenCode is configured to load MCP from `mcp.json` in repo root.

3) Use Chrome debug tools from OpenCode through the `chrome-devtools` MCP server.

## Notes

- If your environment requires a custom Chrome path, pass server args/env in your local OpenCode MCP settings.
- Use this to inspect API calls and UI rendering during local SAM development.
