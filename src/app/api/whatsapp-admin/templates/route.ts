import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { 
  createTemplate, 
  listTemplates, 
  getTemplate, 
  updateTemplate, 
  deleteTemplate 
} from '@/lib/whatsapp/templates/services';

// GET - List all templates
export async function GET(request: Request) {
  try {
    console.log("=== TEMPLATE LIST START ===");
    console.log("Environment:", {
      DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
      ADMIN_TABLE_NAME: process.env.ADMIN_TABLE_NAME,
    });

    // Validate admin session
    console.log("Validating session...");
    const auth = await validateAdminSession(request, 'whatsapp-session');
    console.log("Session valid:", auth.valid);
    
    if (!auth.valid) {
      console.log("Auth failed - returning 401");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Fetching templates from DynamoDB...");
    const templates = await listTemplates();
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

    // Validate admin session
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
    const template = await createTemplate({
      name: body.name,
      category: body.category,
      language: body.language,
      variables: body.variables || [],
    });

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

    // Build updates object
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

    const template = await updateTemplate(body.templateId, updates);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

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

    // Accept templateId from request body (frontend sends it this way)
    const body = await request.json();
    const templateId = body.templateId;
    console.log("Delete templateId:", templateId);

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    console.log("Deleting template:", templateId);
    await deleteTemplate(templateId);

    console.log("=== TEMPLATE DELETE SUCCESS ===");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("=== TEMPLATE DELETE ERROR ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
