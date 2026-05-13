/**
 * Arcus V3 — Notion Handler
 * 
 * Implements execution logic for Notion actions.
 * Whitelisted actions: update_page, create_page.
 */

import { Client } from '@notionhq/client';

/**
 * Notion Action Handler
 */
export async function notionHandler(
  action: string,
  params: any,
  credentials: { accessToken: string }
): Promise<void> {
  const notion = new Client({ auth: credentials.accessToken });

  try {
    switch (action) {
      case 'update_page':
        await updatePage(notion, params);
        return;
      case 'create_page':
        await createPage(notion, params);
        return;
      default:
        throw new Error(`Unsupported Notion action: ${action}`);
    }
  } catch (err: any) {
    throw new Error(`Notion handler error (${action}): ${err.message}`);
  }
}

async function updatePage(notion: Client, params: any) {
  const { pageId, properties, icon, cover, archived } = params;
  if (!pageId) throw new Error('pageId is required for update_page');

  await notion.pages.update({
    page_id: pageId,
    properties: properties || {},
    icon: icon,
    cover: cover,
    archived: archived,
  });

  return { success: true, data: response };
}

async function createPage(notion: Client, params: any) {
  const { parent, properties, children, icon, cover } = params;
  if (!parent) throw new Error('parent (database_id or page_id) is required for create_page');

  const response = await notion.pages.create({
    parent: parent,
    properties: properties || {},
    children: children,
    icon: icon,
    cover: cover,
  });

  return { success: true, data: response };
}
