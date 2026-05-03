import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateContactStrength(emails: any[], userEmail: string) {
  const contactMap = new Map();

  emails.forEach(email => {
    // Determine if user is sender or receiver
    const isSent = email.from === userEmail;
    const contactEmail = isSent ? email.to : email.from;
    
    if (!contactEmail) return;

    if (!contactMap.has(contactEmail)) {
      contactMap.set(contactEmail, {
        name: contactEmail.split('@')[0],
        email: contactEmail,
        count: 0,
        lastDate: email.date
      });
    }

    const contact = contactMap.get(contactEmail);
    contact.count += 1;
    if (new Date(email.date) > new Date(contact.lastDate)) {
      contact.lastDate = email.date;
    }
  });

  return Array.from(contactMap.values()).map(contact => ({
    name: contact.name,
    email: contact.email,
    relationship_score: Math.min(100, contact.count * 10),
    lastActivity: contact.lastDate
  }));
}
