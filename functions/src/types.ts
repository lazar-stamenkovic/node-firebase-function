export interface HubspotTicketData {
  contact?: {
    id: string
    email: string
    firstname: string
    lastname: string
  }
  subject: string
  content: string
  hs_ticket_priority: string
  hs_primary_company: string
  hs_pipeline: string
}

export enum HubspotTicketStatus {
  Waiting = '3',
  Closed = '4'
}

export enum IntercomTicketType {
  Defect = '1',
  FeatureRequest = '2'
}

export interface FirebaseTicket {
  id: string
  hubspot_ticket_id: string
  hubspot_contact_id: string
  intercom_ticket_id: string
  intercom_contact_id: string
  product_board_id: string
}

export const HUBSPOT_FEATURE_REQUEST_PIPELINE = '0'
