import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Document, DocumentInsert, DocumentType } from '@/types/database';
import type { DocumentFilters, ApiResponse, PaginatedResponse } from '@/types/forms';

// GET /api/documents - List documents with optional filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const documentType = searchParams.get('documentType') as DocumentType | null;
    const propertyId = searchParams.get('propertyId');
    const tenantId = searchParams.get('tenantId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (documentType) {
      query = query.eq('document_type', documentType);
    }
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    const response: PaginatedResponse<Document> = {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<Document>>>(
      { success: true, data: response }
    );
  } catch (error) {
    console.error('Error in GET /api/documents:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create a new document (without AI generation)
export async function POST(request: NextRequest) {
  try {
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
    const { document_type, title, content, form_data, property_id, tenant_id, state = 'TX' } = body;

    // Validate required fields
    if (!document_type || !title || !content) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required fields: document_type, title, content' },
        { status: 400 }
      );
    }

    // Create document
    const documentData: DocumentInsert = {
      user_id: user.id,
      document_type,
      title,
      content,
      form_data: form_data || null,
      property_id: property_id || null,
      tenant_id: tenant_id || null,
      state,
    };

    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to create document' },
        { status: 500 }
      );
    }

    // Increment document count for the user
    await supabase.rpc('increment_document_count', { user_id: user.id });

    return NextResponse.json<ApiResponse<Document>>(
      { success: true, data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/documents:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
