import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

interface ImportedProspect {
    name: string;
    email: string;
    jobTitle?: string;
    company?: string;
    location?: string;
    industry?: string;
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const listName = formData.get('listName') as string;

        if (!file) {
            return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
        }

        // Read file content
        const content = await file.text();

        // Parse CSV
        const prospects = parseCSV(content);

        if (prospects.length === 0) {
            return NextResponse.json({ error: 'No valid prospects found in CSV' }, { status: 400 });
        }

        // Save to database
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get user ID
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Create the list
        const { data: list, error: listError } = await supabase
            .from('prospect_lists')
            .insert({
                user_id: user.id,
                name: listName || `Import ${new Date().toLocaleDateString()}`,
                description: `Imported from ${file.name}`,
                prospect_count: prospects.length
            })
            .select()
            .single();

        if (listError) {
            console.error('Error creating list:', listError);
            return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
        }

        // Add prospects to the list
        const prospectRecords = prospects.map((p: ImportedProspect) => ({
            list_id: list.id,
            user_id: user.id,
            name: p.name,
            email: p.email,
            job_title: p.jobTitle || 'Unknown',
            company: p.company || 'Unknown',
            location: p.location,
            industry: p.industry,
            verified: false
        }));

        const { data: insertedProspects, error: prospectsError } = await supabase
            .from('prospects')
            .insert(prospectRecords)
            .select();

        if (prospectsError) {
            console.error('Error adding prospects:', prospectsError);
            return NextResponse.json({
                list,
                prospectsAdded: 0,
                error: 'List created but failed to add prospects'
            }, { status: 207 });
        }

        return NextResponse.json({
            list,
            prospectsAdded: insertedProspects?.length || prospects.length,
            totalParsed: prospects.length
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: 'Import failed' }, { status: 500 });
    }
}

function parseCSV(content: string): ImportedProspect[] {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    // Parse header
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

    // Find column indices
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const nameIdx = headers.findIndex(h =>
        (h.includes('name') && !h.includes('company')) || h === 'full name' || h === 'contact'
    );
    const firstNameIdx = headers.findIndex(h => h === 'first name' || h === 'firstname');
    const lastNameIdx = headers.findIndex(h => h === 'last name' || h === 'lastname');
    const titleIdx = headers.findIndex(h =>
        h.includes('title') || h.includes('position') || h.includes('role')
    );
    const companyIdx = headers.findIndex(h =>
        h.includes('company') || h.includes('organization')
    );
    const locationIdx = headers.findIndex(h =>
        h.includes('location') || h.includes('city') || h.includes('country')
    );
    const industryIdx = headers.findIndex(h => h.includes('industry'));

    if (emailIdx === -1) {
        throw new Error('CSV must have an email column');
    }

    const prospects: ImportedProspect[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        const email = values[emailIdx]?.trim();
        if (!email || !isValidEmail(email)) continue;

        // Build name from first/last name or full name column
        let name = '';
        if (nameIdx >= 0) {
            name = values[nameIdx]?.trim() || '';
        } else if (firstNameIdx >= 0 || lastNameIdx >= 0) {
            const firstName = values[firstNameIdx]?.trim() || '';
            const lastName = values[lastNameIdx]?.trim() || '';
            name = `${firstName} ${lastName}`.trim();
        }

        if (!name) {
            name = extractNameFromEmail(email);
        }

        prospects.push({
            name,
            email,
            jobTitle: values[titleIdx]?.trim() || undefined,
            company: values[companyIdx]?.trim() || undefined,
            location: values[locationIdx]?.trim() || undefined,
            industry: values[industryIdx]?.trim() || undefined
        });
    }

    return prospects;
}

function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current);
    return values;
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    return localPart
        .replace(/[._+]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
