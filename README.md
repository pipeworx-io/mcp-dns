# @pipeworx/mcp-dns

MCP server for DNS lookups — query records, reverse lookups, and bulk DNS resolution.

## Tools

| Tool | Description |
|------|-------------|
| `dns_lookup` | Look up DNS records for a domain (A, AAAA, MX, NS, TXT, CNAME, SOA) |
| `dns_lookup_all` | Query multiple record types at once and return grouped results |
| `reverse_dns` | Reverse DNS lookup for an IPv4 address (PTR record) |

## Quick Start

Add to your MCP client config:

```json
{
  "mcpServers": {
    "dns": {
      "url": "https://gateway.pipeworx.io/dns/mcp"
    }
  }
}
```

Or run via CLI:

```bash
npx pipeworx use dns
```

## License

MIT
