import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallRecord {
  timestamp: string;
  campaignName: string;
  agentName: string;
  customerName: string;
  phoneNumber: string;
  duration: string;
  disposition: string;
}

function generateCSV(records: CallRecord[]): string {
  const header = "Timestamp,Campaign,Agent,Customer Name,Phone Number,Duration,Disposition";
  const rows = records.map(r =>
    [r.timestamp, r.campaignName, r.agentName, r.customerName, r.phoneNumber, r.duration, r.disposition]
      .map(v => `"${(v || '').replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

function generateXLSX(records: CallRecord[]): string {
  // Generate simple XML spreadsheet format (compatible with Excel)
  const escapeXml = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const headers = ["Timestamp", "Campaign", "Agent", "Customer Name", "Phone Number", "Duration", "Disposition"];
  
  let rows = `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>`;
  for (const r of records) {
    const vals = [r.timestamp, r.campaignName, r.agentName, r.customerName, r.phoneNumber, r.duration, r.disposition];
    rows += `<Row>${vals.map(v => `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`).join("")}</Row>`;
  }

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Call Logs">
    <Table>${rows}</Table>
  </Worksheet>
</Workbook>`;
}

function generatePDFHtml(records: CallRecord[]): string {
  const escapeHtml = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const rows = records.map(r => `
    <tr>
      <td>${escapeHtml(r.timestamp)}</td>
      <td>${escapeHtml(r.campaignName)}</td>
      <td>${escapeHtml(r.agentName)}</td>
      <td>${escapeHtml(r.customerName)}</td>
      <td>${escapeHtml(r.phoneNumber)}</td>
      <td>${escapeHtml(r.duration)}</td>
      <td>${escapeHtml(r.disposition)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
    h1 { font-size: 16px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Call Log Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th><th>Campaign</th><th>Agent</th><th>Customer</th><th>Phone</th><th>Duration</th><th>Disposition</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { format, records } = await req.json() as { format: string; records: CallRecord[] };

    if (format === 'csv') {
      const csv = generateCSV(records);
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="call-logs.csv"',
        },
      });
    } else if (format === 'xlsx') {
      const xlsx = generateXLSX(records);
      return new Response(xlsx, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': 'attachment; filename="call-logs.xls"',
        },
      });
    } else if (format === 'pdf') {
      // Return HTML that can be printed as PDF
      const html = generatePDFHtml(records);
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
          'Content-Disposition': 'inline; filename="call-logs.html"',
        },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid format. Use csv, xlsx, or pdf.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
