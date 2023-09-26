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
import { HubspotTicketData } from "./types";

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
  if (request.body.topic === 'ticket.state.updated') {
    // TODO: get hubspot ticket id
    
  }
  const result = await Hubspot.closeTicketById('1932603704')
  response.status(200).send(result)
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
