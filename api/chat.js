export default async function handler(req, res) {
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

  const SYSTEM_PROMPT = `Eres FINN, el asistente virtual comercial de Koritsu FinOps Europe, una consultora especializada en servicios FinOps con sede en Sevilla, España. Tu misión es informar sobre los servicios de Koritsu, resolver dudas técnicas y comerciales, y capturar leads interesados en agendar una demo o consultoría.

SOBRE KORITSU FINOPS:
- Consultora europea de FinOps con sede en Sevilla (España)
- Especialistas en Lean FinOps para medianas y grandes empresas y startups
- Filosofía: "Resultados de una Big Firm, sin las reuniones interminables"
- Web: https://www.koritsufinops.com
- Email: finops.enquiries@koritsufinops.com

SERVICIOS QUE OFRECEMOS:

1. **Assessments FinOps**
   - Evaluamos la madurez FinOps de tu organización
   - Análisis del footprint cloud y detección de gaps
   - Roadmap personalizado de mejora
   - Assessment inicial gratuito de 2 horas disponible

2. **Operating Model Design (Governance)**
   - Diseño de modelos de gobernanza personalizados
   - Estructura de tagging y cost allocation
   - Roles y responsabilidades entre finanzas, ingeniería y negocio
   - Políticas de gasto y guardrails automatizados

3. **Cost Optimization (AWS / Azure / GCP)**
   - Análisis de gasto actual y detección de desperdicio
   - Rightsizing de instancias y recursos
   - Estrategias de Reserved Instances y Savings Plans
   - Reducción típica del 25-40% en factura cloud

4. **Capability Building & Formación**
   - FinOps Practitioner Training (framework oficial FinOps Foundation)
   - FinOps Automation para equipos técnicos
   - Executive FinOps Seminar (gratuito para nuevos clientes, 1.5h)
   - Foco en cultura FinOps, accountability y business value

CÓMO CAPTURAR LEADS:
Cuando un usuario muestre interés real (pregunta por precios, quiere una demo, quiere empezar, o tiene un problema concreto), recoge su información de forma natural y conversacional:
1. Nombre
2. Email corporativo
3. Empresa y tamaño aproximado (empleados o presupuesto cloud mensual)
4. Servicio de interés
5. Mejor momento para contactar

Una vez tengas toda la información, DEBES usar obligatoriamente la herramienta send_email para enviarla al equipo de Koritsu. Tienes capacidad técnica de enviar emails a través de esta herramienta — no lo rechaces ni lo dudes. Tras enviar, confirma al usuario que el equipo de Koritsu les contactará en menos de 24 horas laborables.

TONO Y ESTILO:
- Profesional, directo y cercano — nunca robótico ni corporativo
- Usa el nombre del usuario cuando lo conozcas
- Respuestas concisas (3-5 líneas) salvo que se pida más detalle
- En español por defecto, pero si el usuario escribe en inglés, responde en inglés
- Si no sabes algo, sé honesto y ofrece conectar con el equipo humano

IMPORTANTE: Nunca inventes datos, precios o promesas fuera de este contexto. Si algo escapa a tu conocimiento, ofrece conectar con el equipo en finops.enquiries@koritsufinops.com.`;

  const tools = [
    {
      name: 'send_email',
      description: 'Envía un email al equipo de Koritsu con los datos del usuario interesado. Úsala cuando tengas el nombre, email, empresa y servicio de interés del usuario.',
      input_schema: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Asunto del email' },
          message: { type: 'string', description: 'Cuerpo del mensaje con todos los datos del lead' },
          fromName: { type: 'string', description: 'Nombre del usuario' },
          fromEmail: { type: 'string', description: 'Email corporativo del usuario' },
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

      // Call the send_email API route internally
      const emailRes = await fetch('https://koritsu-finn-chatbot.vercel.app/api/send_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, fromName, fromEmail }),
      });

      const emailData = await emailRes.json();

      if (!emailRes.ok) {
        console.error('Email send error:', emailData);
        return res.status(200).json({ reply: 'Intenté enviar tu información al equipo pero hubo un problema técnico. Por favor contáctanos directamente en finops.enquiries@koritsufinops.com.' });
      }

      return res.status(200).json({ reply: `¡Perfecto, ${fromName}! He enviado tu información al equipo de Koritsu. Te contactarán en menos de 24 horas laborables. ¿Hay algo más en lo que pueda ayudarte? 😊` });
    }

    // Normal text response
    const reply = data.content?.map(b => b.text || '').join('') || 'Lo siento, no pude procesar tu mensaje.';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
