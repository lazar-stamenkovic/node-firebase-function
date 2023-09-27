import * as intercom from 'intercom-client';
import { HubspotTicketData } from './types';
import * as logger from "firebase-functions/logger";

export async function createBackOfficeTicket(data: HubspotTicketData) {

  const intercomClient = new intercom.Client({ tokenAuth: { token: process.env.INTERCOM_ACCESS_TOKEN || ''} })
  if (!data.contact?.email) {
    throw new Error(`cannot find contact email from hubspot data`)
  }
  try {
    // get intercom contact id by email
    const searchRes = await intercomClient.contacts.search({
      data: {
        query: {
            operator: intercom.Operators.AND,
            value: [{field: 'email',operator:intercom.Operators.EQUALS, value: data.contact?.email} ]
        }
      }
    })
    if (!searchRes?.data || !searchRes?.data.length) {
      throw new Error('Failed to serach intercom contact');
    }
    const contactId = searchRes.data[0].id
    const res = await createTicket(contactId, data)
    return {
      ...res,
      contactId
    }
  } catch (e) {
    logger.info({ "intercom-e": e })
    throw e
  }
}

async function createTicket(contactId: string, data: HubspotTicketData) {
  const BACK_OFFICT_TICKET_TYPE_ID = 2
  const resp = await fetch(
    `https://api.intercom.io/tickets`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Intercom-Version': '2.10',
        Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        ticket_type_id: BACK_OFFICT_TICKET_TYPE_ID,
        contacts: [
          {
            id: contactId
          }
        ],
        ticket_attributes: {
          _default_title_: data.subject,
          _default_description_: data.content
        }
      })
    }
  );
  const res = await resp.json();
  return res
}
