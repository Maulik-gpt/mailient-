import { NextResponse } from 'next/server';
import { auth } from '../../lib/auth.js';
import { DatabaseService } from '../../lib/supabase.js';

/**
 * Contacts API - CRM functionality for managing contacts
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const db = new DatabaseService();
    
    let query = db.supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userEmail)
      .order('updated_at', { ascending: false })
      .limit(limit);

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: contacts, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      contacts: contacts || [],
      count: contacts?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Contacts fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch contacts', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const contactData = await request.json();

    // Validate required fields
    if (!contactData.name || !contactData.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const db = new DatabaseService();
    
    // Check if contact already exists
    const { data: existingContact } = await db.supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userEmail)
      .eq('email', contactData.email)
      .single();

    if (existingContact) {
      return NextResponse.json(
        { error: 'Contact already exists' },
        { status: 409 }
      );
    }

    // Create new contact
    const newContact = {
      user_id: userEmail,
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone || null,
      company: contactData.company || null,
      position: contactData.position || null,
      source: contactData.source || 'manual',
      notes: contactData.notes || null,
      tags: contactData.tags || [],
      status: contactData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: contact, error } = await db.supabase
      .from('contacts')
      .insert(newContact)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log activity
    await logContactActivity(userEmail, contact.email, 'created', contact);

    return NextResponse.json({
      success: true,
      contact,
      message: 'Contact created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Contact creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create contact', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('id');

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const updates = await request.json();
    const db = new DatabaseService();

    // Update contact
    const { data: contact, error } = await db.supabase
      .from('contacts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .eq('user_id', userEmail)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Log activity
    await logContactActivity(userEmail, contact.email, 'updated', updates);

    return NextResponse.json({
      success: true,
      contact,
      message: 'Contact updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Contact update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update contact', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('id');

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const db = new DatabaseService();

    // Get contact before deletion for logging
    const { data: contact } = await db.supabase
      .from('contacts')
      .select('email')
      .eq('id', contactId)
      .eq('user_id', userEmail)
      .single();

    // Delete contact
    const { error } = await db.supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userEmail);

    if (error) {
      throw error;
    }

    // Log activity
    if (contact) {
      await logContactActivity(userEmail, contact.email, 'deleted', null);
    }

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Contact deletion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete contact', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to log contact activities
 */
async function logContactActivity(userEmail, contactEmail, action, data) {
  try {
    const db = new DatabaseService();
    
    await db.supabase
      .from('insights')
      .insert({
        user_id: userEmail,
        insight_type: 'crm_activity',
        title: `Contact ${action}: ${contactEmail}`,
        content: JSON.stringify({
          action,
          contactEmail,
          data,
          timestamp: new Date().toISOString()
        }),
        confidence_score: 1.0,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log contact activity:', error);
  }
}
