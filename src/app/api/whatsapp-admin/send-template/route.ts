import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { getTemplate } from '@/lib/whatsapp/templates/services';
import { MessageService, TemplateMessage, TemplateParameter } from '@/lib/whatsapp/meta/messageService';

interface SendTemplateRequest {
  templateName: string;
  recipient: string;
  variables?: string[];
}

/**
 * POST /api/whatsapp-admin/send-template
 * 
 * Send a WhatsApp template message to a recipient.
 * Template must be pre-approved by Meta and marked as active + approved in DB.
 * 
 * Requirements:
 * - Template exists in DB
 * - Template status = 'active'
 * - Template metaStatus = 'APPROVED'
 * - Recipient is valid phone number in international format
 */
export async function POST(request: Request) {
  try {
    console.log("=== SEND TEMPLATE START ===");
    console.log("Timestamp:", new Date().toISOString());

    // Step 1: Validate admin session
    console.log("Step 1: Validating admin session...");
    const auth = await validateAdminSession(request, 'whatsapp-session');
    
    if (!auth.valid) {
      console.log("Auth failed - returning 401");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log("✓ Session valid");

    // Step 2: Parse and validate request
    console.log("Step 2: Parsing request...");
    const body: SendTemplateRequest = await request.json();
    
    if (!body.templateName || !body.recipient) {
      console.log("Validation failed - missing required fields");
      return NextResponse.json({ 
        error: 'Missing required fields: templateName, recipient' 
      }, { status: 400 });
    }

    console.log("Request:", {
      templateName: body.templateName,
      recipient: body.recipient,
      variablesCount: body.variables?.length || 0,
    });

    // Step 3: Fetch and validate template from DB
    console.log("Step 3: Fetching template from DB...");
    const templates = await import('@/lib/whatsapp/templates/services').then(m => m.listTemplates());
    const template = templates.find(t => t.name === body.templateName);

    if (!template) {
      console.log("Template not found:", body.templateName);
      return NextResponse.json({ 
        error: `Template '${body.templateName}' not found in database` 
      }, { status: 404 });
    }

    console.log("Template found:", {
      templateId: template.templateId,
      name: template.name,
      status: template.status,
      metaStatus: template.metaStatus,
      variables: template.variables,
    });

    // Step 4: Validate template is ready to use
    if (template.status !== 'active') {
      console.log("Template not active:", template.status);
      return NextResponse.json({ 
        error: `Template '${body.templateName}' is not active (status: ${template.status})` 
      }, { status: 400 });
    }

    if (template.metaStatus !== 'APPROVED') {
      console.log("Template not approved:", template.metaStatus);
      return NextResponse.json({ 
        error: `Template '${body.templateName}' is not approved by Meta (status: ${template.metaStatus})` 
      }, { status: 400 });
    }

    console.log("✓ Template is active and approved");

    // Step 5: Validate variables match
    const providedVariables = body.variables || [];
    if (providedVariables.length !== template.variables.length) {
      console.log("Variable count mismatch:", {
        expected: template.variables.length,
        provided: providedVariables.length,
      });
      return NextResponse.json({ 
        error: `Template expects ${template.variables.length} variables, but ${providedVariables.length} provided`,
        expectedVariables: template.variables,
      }, { status: 400 });
    }

    console.log("✓ Variables validated");

    // Step 6: Build message payload
    console.log("Step 6: Building message payload...");
    
    const messagePayload: TemplateMessage = {
      type: 'template',
      to: body.recipient,
      template: {
        name: template.name,
        language: {
          code: template.language,
        },
      },
    };

    // Add body variables if present
    if (providedVariables.length > 0) {
      const parameters: TemplateParameter[] = providedVariables.map(value => ({
        type: 'text',
        text: value,
      }));

      messagePayload.template.components = [
        {
          type: 'body',
          parameters,
        },
      ];
    }

    console.log("Message payload ready:", {
      to: messagePayload.to,
      template: messagePayload.template.name,
      componentsCount: messagePayload.template.components?.length || 0,
    });

    // Step 7: Send message via Meta API
    console.log("Step 7: Sending message via Meta API...");
    const messageService = new MessageService();
    const result = await messageService.sendTemplateMessage(messagePayload);

    console.log("✓ Message sent successfully");
    console.log("Result:", {
      messageId: result.messages[0]?.id,
      waId: result.contacts[0]?.wa_id,
    });

    console.log("=== SEND TEMPLATE SUCCESS ===");

    return NextResponse.json({
      success: true,
      message: 'Template message sent successfully',
      data: {
        messageId: result.messages[0]?.id,
        recipient: result.contacts[0]?.wa_id,
        template: template.name,
        status: 'sent',
      },
    });

  } catch (error: any) {
    console.error("=== SEND TEMPLATE ERROR ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    
    // Handle specific Meta API errors
    if (error.message?.includes('Meta API error')) {
      return NextResponse.json({ 
        error: 'Failed to send message',
        details: error.message 
      }, { status: 502 });
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
