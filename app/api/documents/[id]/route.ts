import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Document, DocumentUpdate } from '@/types/database';
import type { ApiResponse } from '@/types/forms';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/documents/[id] - Get a single document
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch document (RLS will ensure user can only see their own)
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Document not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching document:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to fetch document' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Document>>({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/documents/[id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - Update a document
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content, form_data, property_id, tenant_id } = body;

    // Build update object (only include provided fields)
    const updateData: DocumentUpdate = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (form_data !== undefined) updateData.form_data = form_data;
    if (property_id !== undefined) updateData.property_id = property_id;
    if (tenant_id !== undefined) updateData.tenant_id = tenant_id;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update document (RLS will ensure user can only update their own)
    const { data, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Document not found' },
          { status: 404 }
        );
      }
      console.error('Error updating document:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to update document' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Document>>({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/documents/[id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete document (RLS will ensure user can only delete their own)
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
      { success: true, data: { deleted: true } }
    );
  } catch (error) {
    console.error('Error in DELETE /api/documents/[id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
