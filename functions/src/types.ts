export interface HubspotTicketData {
  contact: {
    email: string
    firstname: string
    lastname: string
  }
  subject: string
  content: string
  hs_ticket_priority: string
}