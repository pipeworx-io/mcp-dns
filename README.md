# mcp-dns

DNS MCP — DNS and network lookup tools

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `dns_lookup` | Look up a specific DNS record type for a domain. Specify record type (e.g., 'A', 'MX', 'TXT', 'CNAME'). Returns records with TTLs and data values. |
| `dns_lookup_all` | Query all major DNS record types (A, AAAA, MX, NS, TXT, CNAME) for a domain in one call. Returns results grouped by type with TTLs and values. |
| `reverse_dns` | Find the hostname for an IP address via reverse DNS lookup. Returns the PTR record if available. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "dns": {
      "url": "https://gateway.pipeworx.io/dns/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Dns data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
