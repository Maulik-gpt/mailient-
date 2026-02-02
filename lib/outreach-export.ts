/**
 * Export utilities for outreach data
 * Handles CSV export of prospects, campaigns, and analytics
 */

interface Prospect {
    name: string;
    email: string;
    jobTitle: string;
    company: string;
    location?: string;
    industry?: string;
    verified?: boolean;
}

interface CampaignExport {
    name: string;
    subject: string;
    totalProspects: number;
    sent: number;
    opened: number;
    replied: number;
    openRate: string;
    replyRate: string;
    createdAt: string;
}

export function exportProspectsToCSV(prospects: Prospect[], filename?: string): void {
    const headers = ['Name', 'Email', 'Job Title', 'Company', 'Location', 'Industry', 'Verified'];

    const rows = prospects.map(p => [
        escapeCSV(p.name),
        escapeCSV(p.email),
        escapeCSV(p.jobTitle),
        escapeCSV(p.company),
        escapeCSV(p.location || ''),
        escapeCSV(p.industry || ''),
        p.verified ? 'Yes' : 'No'
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    downloadCSV(csv, filename || `prospects_${formatDate(new Date())}.csv`);
}

export function exportCampaignsToCSV(campaigns: CampaignExport[], filename?: string): void {
    const headers = ['Campaign Name', 'Subject', 'Total Prospects', 'Sent', 'Opened', 'Replied', 'Open Rate', 'Reply Rate', 'Created'];

    const rows = campaigns.map(c => [
        escapeCSV(c.name),
        escapeCSV(c.subject),
        c.totalProspects.toString(),
        c.sent.toString(),
        c.opened.toString(),
        c.replied.toString(),
        c.openRate,
        c.replyRate,
        escapeCSV(c.createdAt)
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    downloadCSV(csv, filename || `campaigns_${formatDate(new Date())}.csv`);
}

export function parseCSVProspects(csvContent: string): Prospect[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    // Find column indices
    const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('company'));
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('position') || h.includes('role'));
    const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('organization'));
    const locationIdx = headers.findIndex(h => h.includes('location') || h.includes('city'));
    const industryIdx = headers.findIndex(h => h.includes('industry'));

    if (emailIdx === -1) {
        throw new Error('CSV must have an email column');
    }

    const prospects: Prospect[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        const email = values[emailIdx]?.trim();
        if (!email || !isValidEmail(email)) continue;

        prospects.push({
            name: values[nameIdx]?.trim() || extractNameFromEmail(email),
            email,
            jobTitle: values[titleIdx]?.trim() || 'Unknown',
            company: values[companyIdx]?.trim() || extractCompanyFromEmail(email),
            location: values[locationIdx]?.trim(),
            industry: values[industryIdx]?.trim(),
            verified: false
        });
    }

    return prospects;
}

// Helper functions
function escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
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
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

function downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    // Convert john.smith or john_smith to John Smith
    return localPart
        .replace(/[._]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function extractCompanyFromEmail(email: string): string {
    const domain = email.split('@')[1];
    if (!domain) return 'Unknown';

    // Remove TLD and format
    const companyName = domain.split('.')[0];
    return companyName.charAt(0).toUpperCase() + companyName.slice(1);
}

export default {
    exportProspectsToCSV,
    exportCampaignsToCSV,
    parseCSVProspects
};
