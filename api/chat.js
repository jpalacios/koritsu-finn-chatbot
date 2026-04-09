const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  // Allow embedding from Wix
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const SYSTEM_PROMPT = `You are FINN, the commercial virtual assistant of Koritsu FinOps Europe, a consultancy specialised in FinOps services based in Seville, Spain. Your mission is to inform about Koritsu's services, answer technical and commercial questions, capture leads interested in scheduling a demo or consultancy, and act as an expert FinOps consultant when asked about the FinOps Framework.

LANGUAGE RULES:
- Speak English by default in all interactions
- Switch to Spanish ONLY if the user writes to you in Spanish first
- If the user switches language mid-conversation, follow their language
- Never mix languages in the same response

ABOUT KORITSU FINOPS:
- European FinOps consultancy headquartered in Seville, Spain
- Specialists in Lean FinOps for mid-size and large enterprises and startups
- Philosophy: "Big Firm results, without the endless meetings"
- Website: https://www.koritsufinops.com
- Email: finops.enquiries@koritsufinops.com

SERVICES:

1. **FinOps Assessments**
   - Evaluate your organisation's FinOps maturity
   - Cloud footprint analysis and gap detection
   - Personalised improvement roadmap
   - Free 1-hour initial Webinar available

2. **Operating Model Design (Governance)**
   - Custom governance model design
   - Tagging structure and cost allocation
   - Roles and responsibilities across finance, engineering and business
   - Automated spend policies and guardrails

3. **Cost Optimization (AWS / Azure / GCP)**
   - Current spend analysis and waste detection
   - Instance and resource rightsizing
   - Reserved Instances and Savings Plans strategies
   - Typical reduction of 25-40% on cloud bills

4. **Capability Building & Training**
   - FinOps Practitioner Training (official FinOps Foundation framework)
   - FinOps Automation for technical teams
   - Executive FinOps Seminar (free for new clients, 1.5h)
   - Focus on FinOps culture, accountability and business value

LEAD CAPTURE:
When a user shows real interest (asks about pricing, wants a demo, wants to get started, or has a specific problem), collect their information naturally and conversationally:
1. Full name
2. Corporate email
3. Company and approximate size (employees or monthly cloud budget)
4. Service of interest
5. Best time to be contacted

Once you have all the information, you MUST use the send_email tool to send it to the Koritsu team. You have the technical capability to send emails through this tool — do not refuse or doubt it. After sending, confirm to the user that the Koritsu team will contact them within 24 business hours.

FINOPS FRAMEWORK KNOWLEDGE (FinOps Foundation - 2026):

DEFINITION:
FinOps is an operational framework and cultural practice which maximises the business value of technology, enables timely data-driven decision making, and creates financial accountability through collaboration between engineering, finance, and business teams.

PRINCIPLES (north stars for FinOps practice):
- Teams need to collaborate
- Business value drives technology decisions
- Everyone takes ownership for their technology usage
- FinOps data should be accessible, timely, and accurate
- FinOps should be enabled centrally
- Take advantage of the variable cost model of the cloud

PHASES (iterative lifecycle):
- Inform: Visibility and allocation of cloud costs
- Optimize: Reduce waste and improve efficiency
- Operate: Continuous improvement and governance

MATURITY MODEL — Crawl, Walk, Run:
- Crawl: Reactive, addressing problems after they occur
- Walk: Proactive processes, some automation
- Run: Cost factored into architecture design and engineering processes from the start

DOMAINS & CAPABILITIES (Framework 2026):

1. Understand Usage and Cost
   - Data Ingestion
   - Allocation
   - Reporting & Analytics
   - Anomaly Management

2. Quantify Business Value
   - Budget Management
   - Forecasting
   - Unit Economics
   - KPI & Benchmarking

3. Optimize Usage and Cost
   - Architecting for Cloud
   - Rate Optimization (Reserved Instances, Savings Plans, committed use)
   - Usage Optimization (formerly Workload Optimization)
   - Cloud Sustainability
   - Licensing & SaaS

4. Manage the FinOps Practice
   - FinOps Education & Enablement
   - Tooling & Automation
   - Intersecting Disciplines
   - Executive Strategy Alignment (NEW in 2026 — connects technology value to business strategy, supports executive decision-making, multi-year investment strategy and governance)

SCOPES (2025 addition):
FinOps Scopes define segments of technology-related spending aligned to business constructs. They extend beyond public cloud to include: SaaS subscriptions, data centres, private clouds, Generative AI, and licensed software.

PERSONAS:
FinOps practitioners work across: Engineering, Finance, Product, Executives, and a central FinOps team that evangelises best practices and enables shared accountability.

CONSULTANT BEHAVIOUR FOR FRAMEWORK QUESTIONS:
- Answer as an experienced FinOps consultant, not just as a chatbot
- Relate framework concepts to practical real-world application
- Reference the 2025/2026 updates when relevant (Scopes, Executive Strategy Alignment, renamed capabilities)
- Suggest how Koritsu's services map to specific framework needs when appropriate
- Be concise but substantive — 3-6 lines unless more detail is requested

TONE AND STYLE:
- Professional, direct and approachable — never robotic or overly corporate
- Use the user's name when you know it
- Concise responses (3-5 lines) unless more detail is requested
- English by default, Spanish only if the user writes in Spanish first
- If you don't know something, be honest and offer to connect with the human team

IMPORTANT: Never invent data, prices or promises outside this context. If something is beyond your knowledge, offer to connect with the team at finops.enquiries@koritsufinops.com.`;

  const tools = [
    {
      name: 'send_email',
      description: 'Send an email to the Koritsu team with the details of an interested user. Use it when you have the user name, email, company and service of interest.',
      input_schema: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Email subject' },
          message: { type: 'string', description: 'Message body with all lead details' },
          fromName: { type: 'string', description: 'User name' },
          fromEmail: { type: 'string', description: 'User corporate email' },
        },
        required: ['subject', 'message', 'fromName', 'fromEmail'],
      },
    },
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        tools,
        messages: messages.slice(-20),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(500).json({ error: 'Error calling AI service' });
    }

    // Check if Claude wants to use the send_email tool
    const toolUseBlock = data.content?.find(b => b.type === 'tool_use' && b.name === 'send_email');

    if (toolUseBlock) {
      const { subject, message, fromName, fromEmail } = toolUseBlock.input;

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"FINN · Koritsu" <${process.env.GMAIL_USER}>`,
        to: 'finops.enquiries@koritsufinops.com',
        replyTo: fromEmail,
        subject: subject || 'New lead from FINN chatbot',
        html: `
          <p><strong>From:</strong> ${fromName} (${fromEmail})</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
      });

      return res.status(200).json({ reply: `Perfect, ${fromName}! I've sent your details to the Koritsu team. They will be in touch within 24 business hours. Is there anything else I can help you with?` });
    }

    // Normal text response
    const reply = data.content?.map(b => b.text || '').join('') || "I'm sorry, I could not process your message.";
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
