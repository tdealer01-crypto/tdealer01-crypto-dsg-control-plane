import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

interface ValidationError {
  field: string;
  message: string;
}

// GET /api/marketplace/products — list products for current org
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all products for the org (using any because marketplace_products is new)
    const { data: products, error: fetchError } = await (supabase as any)
      .from('marketplace_products')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    return NextResponse.json({ ok: true, products });
  } catch (err) {
    logApiError('api/marketplace/products GET', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}

// POST /api/marketplace/products — submit a new product
export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'product-submit'),
    limit: 10,
    windowMs: 3600000, // 1 hour
  });
  const headers = buildRateLimitHeaders(rateLimit, 10);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
    }

    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const price = formData.get('price') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const imageFile = formData.get('image') as File;

    // Validate fields
    const validationErrors: ValidationError[] = [];

    if (!name || name.trim().length < 3) {
      validationErrors.push({ field: 'name', message: 'Product name must be at least 3 characters' });
    }
    if (name && name.trim().length > 100) {
      validationErrors.push({ field: 'name', message: 'Product name must be less than 100 characters' });
    }

    if (!price) {
      validationErrors.push({ field: 'price', message: 'Price is required' });
    } else {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        validationErrors.push({ field: 'price', message: 'Price must be a positive number' });
      }
      if (priceNum > 999999.99) {
        validationErrors.push({ field: 'price', message: 'Price cannot exceed $999,999.99' });
      }
    }

    if (!description || description.trim().length < 10) {
      validationErrors.push({ field: 'description', message: 'Description must be at least 10 characters' });
    }
    if (description && description.trim().length > 1000) {
      validationErrors.push({ field: 'description', message: 'Description must be less than 1000 characters' });
    }

    if (!category) {
      validationErrors.push({ field: 'category', message: 'Category is required' });
    }

    if (!imageFile) {
      validationErrors.push({ field: 'image', message: 'Product image is required' });
    } else {
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        validationErrors.push({ field: 'image', message: 'Image must be JPEG or PNG format' });
      }
      if (imageFile.size > MAX_IMAGE_SIZE) {
        validationErrors.push({ field: 'image', message: `Image size must be less than 5MB` });
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validationErrors },
        { status: 400, headers }
      );
    }

    // Convert image to base64 for storage (or upload to external service in production)
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const imageDataUrl = `data:${imageFile.type};base64,${imageBase64}`;

    // Insert product into database (using any because marketplace_products is new)
    const { data: product, error: insertError } = await (supabase as any)
      .from('marketplace_products')
      .insert({
        org_id: userProfile.org_id,
        created_by: userProfile.id,
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim(),
        category,
        image_url: imageDataUrl, // In production, upload to cloud storage
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(
      { ok: true, product, message: 'Product submitted successfully' },
      { status: 201, headers }
    );
  } catch (err) {
    logApiError('api/marketplace/products POST', err, {});
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500, headers: buildRateLimitHeaders(rateLimit, 10) }
    );
  }
}
