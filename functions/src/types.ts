export interface HubspotTicketData {
  contact: {
    id: string
    email: string
    firstname: string
    lastname: string
  }
  subject: string
  content: string
  hs_ticket_priority: string
  hs_primary_company: string
}

export enum HubspotTicketStatus {
  Waiting = '3',
  Closed = '4'
}

export interface FirebaseTicket {
  hubspot_ticket_id: string
  hubspot_contact_id: string
  intercom_ticket_id: string
  intercom_contact_id: string
}
