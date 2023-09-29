import * as intercom from 'intercom-client';
import { HubspotTicketData, IntercomTicketType, HUBSPOT_FEATURE_REQUEST_PIPELINE, INTERCOM_DEFAULT_CONTACT_ID } from './types';
import * as logger from "firebase-functions/logger";

export async function createBackOfficeTicket(data: HubspotTicketData) {
  const default_contact_id = INTERCOM_DEFAULT_CONTACT_ID // email is 'support@transax.com'
  const intercomClient = new intercom.Client({ tokenAuth: { token: process.env.INTERCOM_ACCESS_TOKEN || ''} })
  let contactId = default_contact_id
  try {
    // get intercom contact id by email
    if (data.contact) {
      const searchRes = await intercomClient.contacts.search({
        data: {
          query: {
              operator: intercom.Operators.AND,
              value: [{field: 'email',operator:intercom.Operators.EQUALS, value: data.contact.email } ]
          }
        }
      })
      if (searchRes?.data && searchRes.data.length > 0) {
        contactId = searchRes.data[0].id
      }
    }
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
  let ticket_type_id = IntercomTicketType.Defect
  let attribute = undefined
  if (data.hs_pipeline === HUBSPOT_FEATURE_REQUEST_PIPELINE ) {
    ticket_type_id = IntercomTicketType.FeatureRequest
    attribute = {
      _default_title_: data.subject || '',
      _default_description_: data.content || '',
      'Primary Company': data.hs_primary_company || '',
      'Priority': data.hs_ticket_priority || '',
      'Contact Email': data.contact?.email || ''
    }
  } else {
    ticket_type_id = IntercomTicketType.Defect
    attribute = {
      _default_title_: data.subject || '',
      _default_description_: data.content || '',
      'Customer Type': ['Standard Customer'],
      'Primary Company': data.hs_primary_company || '',
      'Priority': data.hs_ticket_priority || '',
      'Contact Email': data.contact?.email || '',
      'Area of Defect': ['Messaging', 'Transax Dashboard']
    }
  }
  const body = JSON.stringify({
    ticket_type_id: ticket_type_id,
    contacts: [
      {
        id: contactId
      }
    ],
    ticket_attributes: attribute
  })
  const resp = await fetch(
    `https://api.intercom.io/tickets`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Intercom-Version': '2.10',
        Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`
      },
      body: body
    }
  );
  const res = await resp.json();
  return res
}

