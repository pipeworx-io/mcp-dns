interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * DNS MCP — DNS and network lookup tools
 *
 * Tools:
 * - dns_lookup: query DNS records for a domain using Google DNS-over-HTTPS
 * - dns_lookup_all: query multiple record types (A, AAAA, MX, NS, TXT, CNAME) at once
 * - reverse_dns: look up the PTR record for an IP address
 */


const GOOGLE_DOH = 'https://dns.google/resolve';

const tools: McpToolExport['tools'] = [
  {
    name: 'dns_lookup',
    description:
      'Look up DNS records for a domain using Google DNS-over-HTTPS. Returns records of the requested type with TTLs and data values.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain name to look up (e.g., "example.com", "mail.google.com")',
        },
        type: {
          type: 'string',
          description:
            'DNS record type to query (e.g., "A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"). Defaults to "A".',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'dns_lookup_all',
    description:
      'Look up multiple DNS record types for a domain in one call. Queries A, AAAA, MX, NS, TXT, and CNAME records simultaneously and returns all results grouped by type.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain name to look up (e.g., "example.com")',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'reverse_dns',
    description:
      'Perform a reverse DNS lookup for an IP address. Returns the PTR record (hostname) associated with the IP, if one exists.',
    inputSchema: {
      type: 'object',
      properties: {
        ip: {
          type: 'string',
          description: 'IPv4 address to reverse-lookup (e.g., "8.8.8.8")',
        },
      },
      required: ['ip'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'dns_lookup':
      return dnsLookup(args.domain as string, (args.type as string) ?? 'A');
    case 'dns_lookup_all':
      return dnsLookupAll(args.domain as string);
    case 'reverse_dns':
      return reverseDns(args.ip as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

interface DohRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DohResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: { name: string; type: number }[];
  Answer?: DohRecord[];
  Authority?: DohRecord[];
  Comment?: string;
}

const DNS_TYPE_NAMES: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
  33: 'SRV',
  257: 'CAA',
};

const DNS_STATUS: Record<number, string> = {
  0: 'NOERROR',
  1: 'FORMERR',
  2: 'SERVFAIL',
  3: 'NXDOMAIN',
  4: 'NOTIMP',
  5: 'REFUSED',
};

async function dnsQuery(name: string, type: string): Promise<DohResponse> {
  const params = new URLSearchParams({ name, type });
  const res = await fetch(`${GOOGLE_DOH}?${params}`, {
    headers: { Accept: 'application/dns-json' },
  });
  if (!res.ok) throw new Error(`Google DNS-over-HTTPS error: ${res.status}`);
  return (await res.json()) as DohResponse;
}

async function dnsLookup(domain: string, type: string) {
  const recordType = type.toUpperCase();
  const data = await dnsQuery(domain, recordType);

  const status = DNS_STATUS[data.Status] ?? `RCODE ${data.Status}`;
  if (data.Status !== 0) {
    return {
      domain,
      type: recordType,
      status,
      records: [],
    };
  }

  const records = (data.Answer ?? []).map((r) => ({
    name: r.name,
    type: DNS_TYPE_NAMES[r.type] ?? `TYPE${r.type}`,
    ttl_seconds: r.TTL,
    value: r.data,
  }));

  return {
    domain,
    type: recordType,
    status,
    records,
    record_count: records.length,
  };
}

async function dnsLookupAll(domain: string) {
  const types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'];

  const results = await Promise.allSettled(types.map((t) => dnsQuery(domain, t)));

  const grouped: Record<string, { ttl_seconds: number; value: string }[]> = {};

  for (let i = 0; i < types.length; i++) {
    const result = results[i];
    const recordType = types[i];

    if (result.status === 'rejected') {
      grouped[recordType] = [];
      continue;
    }

    const data = result.value;
    if (data.Status !== 0 || !data.Answer) {
      grouped[recordType] = [];
      continue;
    }

    grouped[recordType] = data.Answer.filter(
      (r) => DNS_TYPE_NAMES[r.type] === recordType,
    ).map((r) => ({
      ttl_seconds: r.TTL,
      value: r.data,
    }));
  }

  return {
    domain,
    records: grouped,
  };
}

async function reverseDns(ip: string) {
  // Convert IPv4 to .in-addr.arpa format: "8.8.8.8" -> "8.8.8.8.in-addr.arpa"
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some((p) => isNaN(Number(p)))) {
    throw new Error('Invalid IPv4 address. Provide a valid IPv4 address (e.g., "8.8.8.8").');
  }

  const reversedName = `${parts[3]}.${parts[2]}.${parts[1]}.${parts[0]}.in-addr.arpa`;
  const data = await dnsQuery(reversedName, 'PTR');

  const status = DNS_STATUS[data.Status] ?? `RCODE ${data.Status}`;

  const hostnames = (data.Answer ?? [])
    .filter((r) => r.type === 12)
    .map((r) => r.data.replace(/\.$/, '')); // strip trailing dot

  return {
    ip,
    reverse_name: reversedName,
    status,
    hostnames,
    primary_hostname: hostnames[0] ?? null,
  };
}

export default { tools, callTool } satisfies McpToolExport;
