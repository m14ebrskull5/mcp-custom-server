import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const server = new McpServer({
    name: "backwards-compatible-server",
    version: "1.0.0"
});

// ... set up server resources, tools, and prompts ...
server.tool(
    "get-user",
    "根据名字查询用户BMI信息",
    {
        name: z.string(),
    },
    async ({ name }: { name: string; }) => {
        console.log(`Get User: ${name}`);
        return {
            content: [{
                type: "text",
                text: "Haha, this is a mock response for user: " + name
            }]
        }
    }
);
// ... set up server resources, tools, and prompts ...
server.tool(
    "calculate-bmi",
    "根据体重（kg）和身高（米）计算 BMI（体质指数）",
    {
        weightKg: z.number(),
        heightM: z.number()
    },
    async ({ weightKg, heightM }: { weightKg: number; heightM: number }) => {
        console.log(`Calculating BMI for weight: ${weightKg} kg, height: ${heightM} m`);
        return {
            content: [{
                type: "text",
                text: String(weightKg / (heightM * heightM))
            }]
        }
    }
);
const app = express();
app.use(express.json());

// Store transports for each session type
const transports = {
    streamable: {} as Record<string, StreamableHTTPServerTransport>,
    sse: {} as Record<string, SSEServerTransport>
};

// Modern Streamable HTTP endpoint
app.all('/mcp', async (req, res) => {
    // Handle Streamable HTTP transport for modern clients
    // Implementation as shown in the "With Session Management" example
    // ...
});

// Legacy SSE endpoint for older clients
app.get('/sse', async (req, res) => {
    // Create SSE transport for legacy clients
    const transport = new SSEServerTransport('/messages', res);
    transports.sse[transport.sessionId] = transport;

    res.on("close", () => {
        delete transports.sse[transport.sessionId];
    });

    await server.connect(transport);
});

// Legacy message endpoint for older clients
app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.sse[sessionId];
    if (transport) {
        await transport.handlePostMessage(req, res, req.body);
    } else {
        res.status(400).send('No transport found for sessionId');
    }
});

app.listen(3002, () => {
    console.log("Server is running on http://localhost:3002");
});