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
    // Validate admin session
    const auth = await validateAdminSession(request, 'whatsapp-session');
    
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await listTemplates();

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new template
export async function POST(request: Request) {
  try {
    // Validate admin session
    const auth = await validateAdminSession(request, 'whatsapp-session');
    
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.category || !body.language) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, category, language' 
      }, { status: 400 });
    }

    // Create template
    const template = await createTemplate({
      name: body.name,
      category: body.category,
      language: body.language,
      variables: body.variables || [],
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update template
export async function PUT(request: Request) {
  try {
    // Validate admin session
    const auth = await validateAdminSession(request, 'whatsapp-session');
    
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const template = await updateTemplate(body.templateId, updates);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete template
export async function DELETE(request: Request) {
  try {
    // Validate admin session
    const auth = await validateAdminSession(request, 'whatsapp-session');
    
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    await deleteTemplate(templateId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
