import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  labels: string[];
}

export interface Contact {
  email: string;
  strength: number;
  frequency: number;
  recencyDays: number;
  durationDays: number;
}

export function calculateContactStrength(emails: Email[], userEmail: string): Contact[] {
  const contactMap = new Map<string, {
    emails: Email[];
    firstDate: Date;
    lastDate: Date;
  }>();

  const now = new Date();

  emails.forEach(email => {
    const contacts = new Set<string>();

    // Add from email if not user
    if (email.from && email.from !== userEmail) {
      contacts.add(email.from);
    }

    // Add to emails if not user
    if (email.to) {
      // Assuming to is comma-separated string
      const toEmails = email.to.split(',').map(e => e.trim());
      toEmails.forEach(e => {
        if (e && e !== userEmail) {
          contacts.add(e);
        }
      });
    }

    const emailDate = new Date(email.date);

    contacts.forEach(contact => {
      if (!contactMap.has(contact)) {
        contactMap.set(contact, {
          emails: [],
          firstDate: emailDate,
          lastDate: emailDate,
        });
      }
      const data = contactMap.get(contact)!;
      data.emails.push(email);
      if (emailDate < data.firstDate) data.firstDate = emailDate;
      if (emailDate > data.lastDate) data.lastDate = emailDate;
    });
  });

  const contacts: Contact[] = [];

  contactMap.forEach((data, email) => {
    const frequency = data.emails.length;
    const recencyDays = Math.floor((now.getTime() - data.lastDate.getTime()) / (1000 * 60 * 60 * 24));
    const durationDays = Math.floor((data.lastDate.getTime() - data.firstDate.getTime()) / (1000 * 60 * 60 * 24));

    // Strength formula: frequency * (1 / (1 + recency_days / 7)) * (1 + duration_days / 365)
    const recencyFactor = 1 / (1 + recencyDays / 7);
    const durationFactor = 1 + durationDays / 365;
    const strength = frequency * recencyFactor * durationFactor;

    contacts.push({
      email,
      strength,
      frequency,
      recencyDays,
      durationDays,
    });
  });

  // Sort by strength descending
  contacts.sort((a, b) => b.strength - a.strength);

  return contacts;
}