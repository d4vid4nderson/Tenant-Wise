import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch all images for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify property belongs to user
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Fetch images
    const { data: images, error: imagesError } = await supabase
      .from('property_images')
      .select('*')
      .eq('property_id', propertyId)
      .order('display_order', { ascending: true });

    if (imagesError) {
      console.error('Error fetching images:', imagesError);
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    return NextResponse.json({ images: images || [] });
  } catch (error) {
    console.error('Error in GET /api/properties/[id]/images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a new image to a property
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify property belongs to user
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const body = await request.json();
    const { image_url, caption, is_primary } = body;

    if (!image_url) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Get the current highest display_order
    const { data: existingImages } = await supabase
      .from('property_images')
      .select('display_order')
      .eq('property_id', propertyId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existingImages && existingImages.length > 0
      ? (existingImages[0].display_order || 0) + 1
      : 0;

    // If this is the first image, make it primary by default
    const { count } = await supabase
      .from('property_images')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId);

    const shouldBePrimary = is_primary || count === 0;

    // Insert the new image
    const { data: newImage, error: insertError } = await supabase
      .from('property_images')
      .insert({
        property_id: propertyId,
        image_url,
        caption: caption || null,
        display_order: nextOrder,
        is_primary: shouldBePrimary,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting image:', insertError);
      return NextResponse.json({ error: 'Failed to add image' }, { status: 500 });
    }

    return NextResponse.json({ image: newImage }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/properties/[id]/images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update image (caption, order, primary status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify property belongs to user
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const body = await request.json();
    const { image_id, caption, display_order, is_primary } = body;

    if (!image_id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (caption !== undefined) updates.caption = caption;
    if (display_order !== undefined) updates.display_order = display_order;
    if (is_primary !== undefined) updates.is_primary = is_primary;

    const { data: updatedImage, error: updateError } = await supabase
      .from('property_images')
      .update(updates)
      .eq('id', image_id)
      .eq('property_id', propertyId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating image:', updateError);
      return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
    }

    return NextResponse.json({ image: updatedImage });
  } catch (error) {
    console.error('Error in PATCH /api/properties/[id]/images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove an image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify property belongs to user
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Get the image to delete (to get its URL for storage cleanup)
    const { data: imageToDelete } = await supabase
      .from('property_images')
      .select('*')
      .eq('id', imageId)
      .eq('property_id', propertyId)
      .single();

    if (!imageToDelete) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('property_images')
      .delete()
      .eq('id', imageId)
      .eq('property_id', propertyId);

    if (deleteError) {
      console.error('Error deleting image:', deleteError);
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }

    // Try to delete from storage (extract path from URL)
    try {
      const url = new URL(imageToDelete.image_url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/property-images\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from('property-images').remove([pathMatch[1]]);
      }
    } catch (storageError) {
      console.error('Error deleting from storage (non-fatal):', storageError);
    }

    // If deleted image was primary, set another one as primary
    if (imageToDelete.is_primary) {
      const { data: remainingImages } = await supabase
        .from('property_images')
        .select('id')
        .eq('property_id', propertyId)
        .order('display_order', { ascending: true })
        .limit(1);

      if (remainingImages && remainingImages.length > 0) {
        await supabase
          .from('property_images')
          .update({ is_primary: true })
          .eq('id', remainingImages[0].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/properties/[id]/images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
