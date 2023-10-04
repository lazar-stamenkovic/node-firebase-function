/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import * as Hubspot from "./hubspot";
import * as Intercom from "./intercom";
import * as Firebase from "./firebase";
import * as ProductBoard from "./product_board";

import { HubspotTicketData, IntercomTicketType } from "./types";

require('dotenv').config()

export const hubspotSubmit = onRequest(async (request, response) => { // webhook on hubspot ticket creation
  logger.info({ "webhookbody": request.body})
  const data = request.body.length > 0 ? request.body[0] : null
  logger.info({ "hubspotSubmitData": data})
  try {
    if (data.subscriptionType === 'ticket.creation') {
      // get hubspot ticket detail
      const ticket =  await Hubspot.getTicketById(data.objectId)
      logger.info({ "ticket": ticket, msg: "success to get ticket from webhook"})
      // create intercom back-office ticket based on hubspot ticket data
      const result = await Intercom.createBackOfficeTicket(ticket as HubspotTicketData)
      logger.info({ "result": result, msg: "ticket creation succeed"})
      if (result?.id) {
        await Firebase.saveTicket({
          hubspot_ticket_id: data.objectId,
          hubspot_contact_id: ticket.contact?.id,
          Hubspot_ticket_pipeline: ticket.hs_pipeline,
          intercom_ticket_id: result.id,
          intercom_contact_id: result.contactId
        })  
      }
      response.status(200).send(result);
    } else {
      console.log('invalid request')
      response.status(400).send('invalid request')
    }  
  } catch(e: any) {
    response.status(500).send(e)
  }
})

export const intercomTicketUpdated = onRequest(async (request, response) => { // webhook on intercom ticket updated
  logger.info({ "intercomTicketUpdated": request.body})
  try {
    if (request.body.topic === 'ticket.note.created') {
      const intercomTicket = request.body.data?.item?.ticket
      if (!intercomTicket) {
        logger.info({ "success": false, msg: "can't get ticket data from request body"})
        throw new Error("can't get ticket data from request body")
      }
      logger.info({ "intercomTicket": intercomTicket, msg: "success to get intercom ticket"})
      // if (!['resolved', 'closed'].includes(intercomTicket.ticket_state)) {
      //   logger.info({ "success": false, msg: "not resolved ticket"})
      //   response.status(200).send("not resolved ticket")
      //   return
      // }
      // if (intercomTicket.ticket_type.id !== IntercomTicketType.FeatureRequest) {
      //   logger.info({ "success": false, msg: "not feature request ticket"})
      //   response.status(200).send("not feature request ticket")
      //   return
      // }
      const firebaseTicket = await Firebase.getTicketByIntercomTicketId(intercomTicket.id)
      if (!firebaseTicket) {
        logger.info({ "success": false, msg: "can't find firebase ticket"})
        throw new Error("can't find firebase ticket")
      }
      const ticket_part = request.body.data?.item?.ticket_part
      if (!ticket_part) {
        logger.info({ "success": false, msg: "can't get ticket part from request body"})
        throw new Error("can't get ticket part from request body")
      }
      const body: string = ticket_part.body
      if (body && body.toLocaleLowerCase().includes('released') && body.includes('https://fitow.atlassian.net/browse')) { //jira ticket marked as released
        const ticket =  await Hubspot.getTicketById(firebaseTicket.hubspot_ticket_id)
        const result = await Hubspot.closeTicketById(firebaseTicket.hubspot_ticket_id)
        if (!firebaseTicket.product_board_id) {
          const prodRes = await ProductBoard.createNote(ticket as HubspotTicketData)
          await Firebase.updateTicket(firebaseTicket.id, {product_board_id: prodRes.data?.id })  
        }
        response.status(200).send(result)
      } else {
        logger.info({ "success": false, msg: "not released note"})
        throw new Error("not released note")
      }  
    } else if (request.body.topic === 'ticket.state.updated') {
      const intercomTicket = request.body.data?.item
      if (!['resolved', 'closed'].includes(intercomTicket.ticket_state)) {
        logger.info({ "success": false, msg: "not resolved ticket"})
        response.status(200).send("not resolved ticket")
        return
      }
      if (intercomTicket.ticket_type.id !== IntercomTicketType.FeatureRequest) {
        logger.info({ "success": false, msg: "not feature request ticket"})
        response.status(200).send("not feature request ticket")
        return
      }
      const firebaseTicket = await Firebase.getTicketByIntercomTicketId(intercomTicket.id)
      if (!firebaseTicket) {
        logger.info({ "success": false, msg: "can't find firebase ticket"})
        throw new Error("can't find firebase ticket")
      }
      const ticket =  await Hubspot.getTicketById(firebaseTicket.hubspot_ticket_id)
      if (!firebaseTicket.product_board_id) {
        const prodRes = await ProductBoard.createNote(ticket as HubspotTicketData)
        await Firebase.updateTicket(firebaseTicket.id, {product_board_id: prodRes.data?.id })  
        logger.info({ "success": true, msg: "update product board note"})
      }
      response.status(200).send("success to create product board note on ticket close")
      return
    } else  {
      logger.info({ "success": false, msg: "not note created or state updated topic"})
      response.status(200).send("not note created or state updated topic")
    }
  } catch(e: any) {
    logger.info({ "success": false, msg: e})
    response.status(500).send(e)
  }
})

export const getHubspotAccessToken = onRequest(async (request, response) => {
  logger.info({ "getHubspotAccessToken request body": request.body})
  const code = request.body.code
  if (!code) {
    console.error('invalid code')
    response.status(400).send('invalid code')
  }
  const tokenRes = await Hubspot.getAccessToken(code)
  response.status(200).send(tokenRes);
})
