import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { whatsappRepository } from '@/lib/repositories';
import { randomUUID } from 'crypto';

// GET - List all templates
export async function GET(request: Request) {
  try {
    console.log("=== TEMPLATE LIST START ===");
    console.log("Environment:", {
      DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
      ADMIN_TABLE_NAME: process.env.ADMIN_TABLE_NAME,
    });

    // Validate admin session (bypass in development)
    if (process.env.NODE_ENV !== 'development') {
      console.log("Validating session...");
      const auth = await validateAdminSession(request, 'whatsapp-session');
      console.log("Session valid:", auth.valid);
      
      if (!auth.valid) {
        console.log("Auth failed - returning 401");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.log("⚠️ Development mode - skipping authentication");
    }

    console.log("Fetching templates from DynamoDB...");
    const templates = await whatsappRepository.listTemplates();
    console.log("Templates fetched:", templates.length);

    console.log("=== TEMPLATE LIST SUCCESS ===");
    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("=== TEMPLATE LIST ERROR ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new template
export async function POST(request: Request) {
  try {
    console.log("=== TEMPLATE CREATE START ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Environment:", {
      DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
      ADMIN_TABLE_NAME: process.env.ADMIN_TABLE_NAME,
      AWS_REGION: process.env.AWS_REGION,
    });

    // Validate admin session (bypass in development)
    if (process.env.NODE_ENV !== 'development') {
      console.log("Step 1: Validating session...");
      const auth = await validateAdminSession(request, 'whatsapp-session');
      console.log("Session validation result:", {
        valid: auth.valid,
        error: auth.error,
        hasSession: !!auth.session,
      });
      
      if (!auth.valid) {
        console.log("Auth failed - returning 401");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.log("⚠️ Development mode - skipping authentication");
    }

    console.log("Step 2: Parsing request body...");
    const body = await request.json();
    console.log("Request body:", {
      name: body.name,
      category: body.category,
      language: body.language,
      variablesCount: body.variables?.length || 0,
    });
    
    // Validate required fields
    if (!body.name || !body.category || !body.language) {
      console.log("Validation failed - missing required fields");
      return NextResponse.json({ 
        error: 'Missing required fields: name, category, language' 
      }, { status: 400 });
    }

    console.log("Step 3: Creating template in DynamoDB...");
    // Create template
    const now = new Date().toISOString();
    const template = {
      templateId: randomUUID(),
      name: body.name,
      category: body.category,
      language: body.language,
      variables: body.variables || [],
      status: 'draft' as const,
      metaStatus: 'NOT_SUBMITTED' as const,
      createdAt: now,
      updatedAt: now
    };

    await whatsappRepository.saveTemplate(template);

    console.log("Template created successfully:", {
      templateId: template.templateId,
      name: template.name,
      status: template.status,
    });

    console.log("=== TEMPLATE CREATE SUCCESS ===");
    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    console.error("=== TEMPLATE CREATE ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error stack:", error?.stack);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    
    return NextResponse.json({ 
      error: error?.message || 'Internal server error',
      details: error?.code || 'UNKNOWN_ERROR',
    }, { status: 500 });
  }
}

// PUT - Update template
export async function PUT(request: Request) {
  try {
    console.log("=== TEMPLATE UPDATE START ===");

    // Validate admin session
    const auth = await validateAdminSession(request, 'whatsapp-session');
    console.log("Session valid:", auth.valid);
    
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log("Update request body:", body);
    
    if (!body.templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    // Validate enum fields
    const VALID_STATUSES = ['draft', 'active', 'archived'] as const;
    const VALID_META_STATUSES = ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED'] as const;
    const VALID_CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION'] as const;

    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    if (body.metaStatus !== undefined && !VALID_META_STATUSES.includes(body.metaStatus)) {
      return NextResponse.json({ error: `Invalid metaStatus. Must be one of: ${VALID_META_STATUSES.join(', ')}` }, { status: 400 });
    }
    if (body.category !== undefined && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }
    const updates: any = {};
    
    if (body.name !== undefined) updates.name = body.name;
    if (body.category !== undefined) updates.category = body.category;
    if (body.language !== undefined) updates.language = body.language;
    if (body.variables !== undefined) updates.variables = body.variables;
    if (body.status !== undefined) updates.status = body.status;
    if (body.metaStatus !== undefined) updates.metaStatus = body.metaStatus;

    console.log("Updates to apply:", updates);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Get existing template
    const existingTemplate = await whatsappRepository.getTemplate(body.templateId);
    
    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Merge updates with existing template
    const template = {
      ...existingTemplate,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await whatsappRepository.saveTemplate(template);

    console.log("=== TEMPLATE UPDATE SUCCESS ===");
    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("=== TEMPLATE UPDATE ERROR ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete template
export async function DELETE(request: Request) {
  try {
    console.log("=== TEMPLATE DELETE START ===");

    // Validate admin session
    const auth = await validateAdminSession(request, 'whatsapp-session');
    console.log("Session valid:", auth.valid);
    
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read templateId from query parameter (DELETE requests must not have a body)
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId')?.trim();
    console.log("Delete templateId:", templateId);

    if (!templateId) {
      return NextResponse.json({ error: 'templateId query parameter is required' }, { status: 400 });
    }

    console.log("Deleting template:", templateId);
    await whatsappRepository.deleteTemplate(templateId);

    console.log("=== TEMPLATE DELETE SUCCESS ===");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("=== TEMPLATE DELETE ERROR ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
