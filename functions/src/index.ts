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

require('dotenv').config()

export const hubspotSubmit = onRequest(async (request, response) => {
  logger.info({ "hubspotSubmit": request.body})
  const body = request.body
  try {
    if (body.subscriptionType === 'ticket.creation') {
      const ticket =  await Hubspot.getTicketById(body.objectId)
      logger.info({ "ticket": ticket, msg: "success to get ticket from webhook"})
      // TODO: integrate intercom api to create the ticket in intercom.
      response.status(200).send(ticket);
    } else {
      console.log('invalid request')
      response.status(400).send('invalid request')
    }  
  } catch(e: any) {
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
