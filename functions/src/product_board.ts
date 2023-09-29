import fetch from 'node-fetch';
import { HubspotTicketData } from './types';

export async function createNote(data: HubspotTicketData) {
  const body = JSON.stringify({
    title: data.subject,
    tags: [
      'featurerequest'
    ],
    customer_email: data.contact?.email || 'support@transax.com',
    content: `
      <b>Title:</b>&nbsp; ${data.subject}<br>
      <b>Company:</b>&nbsp; ${data.hs_primary_company}<br>
      <b>Contact:</b>&nbsp; ${data.contact?.email || ''}(${data.contact?.firstname||''} ${data.contact?.lastname || ''})<br>
      <b>Description:</b>&nbsp; ${data.content}<br>
      <b>Priority:</b>&nbsp; ${data.hs_ticket_priority}<br>
    `
  })
  const resp = await fetch(
    `https://api.productboard.com/notes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Version': '1',
        Authorization: `Bearer ${process.env.PRODUCT_BOARD_ACCESS_TOKEN}`
      },
      body: body
    }
  );
  const res = await resp.json();
  return res
}
