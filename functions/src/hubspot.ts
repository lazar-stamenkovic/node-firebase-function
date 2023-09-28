import * as hubspot from '@hubspot/api-client';
import * as logger from "firebase-functions/logger";
import fetch from 'node-fetch';
import { HubspotTicketStatus } from './types';
import * as firebase from './firebase';

let tokenStore: any
const hubspotClient = new hubspot.Client()
const GRANT_TYPES = {
  AUTHORIZATION_CODE: 'authorization_code',
  REFRESH_TOKEN: 'refresh_token',
};

export async function getTicketById(id: string) {
  await setAccessToken()
  const ticket = await hubspotClient.crm.tickets.basicApi.getById(id, ['subject', 'content', 'created_by', 'hs_ticket_priority', 'hs_primary_company', 'source_type', 'hs_last_email_activity', 'contacts', 'hs_created_by_user_id'])
  // get contacts id list
  const assRes = await fetch(
    `https://api.hubspot.com/crm-associations/v1/associations/${id}/HUBSPOT_DEFINED/16`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStore.accessToken}`
      }
    }
  );
  const assData = await assRes.json();
  let contact = undefined
  // get contact detail with email, firstname, lastname
  if (assData?.results?.length) {
    const contactId = assData.results[0]
    const contactRes = await hubspotClient.crm.contacts.basicApi.getById(contactId, ['email', 'firstname', 'lastname'])
    contact = {
      id: contactId,
      email: contactRes.properties.email,
      firstname: contactRes.properties.firstname,
      lastname: contactRes.properties.lastname
    }
  }
  return { ...ticket.properties, contact}
}

export async function closeTicketById(id: string) {
  await setAccessToken()
  const ticket = await hubspotClient.crm.tickets.basicApi.update(id,  {'properties': {
    'hs_pipeline_stage': HubspotTicketStatus.Closed
  }})
  return ticket
}

async function setAccessToken() {
  tokenStore = await firebase.getHubSpotToken()
  logger.info({ "tokenstore": tokenStore, "function": "setAccessToken"});
  if (!isAuthorized()) {
    throw Error("no tokenstore, please call getHubspotAccessToken function with a valid code")
  }
  if (isTokenExpired()) {
    logger.info({ "tokenExpired": true, "msg": "token is expired. refreshing..."});
    await refreshToken()
  }
  hubspotClient.setAccessToken(tokenStore.accessToken)
}

async function refreshToken() {
  const result = await hubspotClient.oauth.tokensApi.create(
    GRANT_TYPES.REFRESH_TOKEN,
    undefined,
    undefined,
    process.env.HUBSPOT_CLIENT_ID,
    process.env.HUBSPOT_CLIENT_SECRET,
    tokenStore.refreshToken
  );
  tokenStore = result;
  tokenStore.updatedAt = Date.now();
  await firebase.saveHubSpotToken(tokenStore)
  return result
}

// using once to save token response after deploy
export async function getAccessToken(code: string) {
  const tokensResponse = await hubspotClient.oauth.tokensApi.create(
    GRANT_TYPES.AUTHORIZATION_CODE,
    code,
    process.env.HUBSPOT_REDIRECT_URI,
    process.env.HUBSPOT_CLIENT_ID,
    process.env.HUBSPOT_CLIENT_SECRET
  );
  logger.info('Retrieving access token result:', tokensResponse);
  tokenStore = tokensResponse;
  tokenStore.updatedAt = Date.now();
  await firebase.saveHubSpotToken(tokenStore)
  return tokensResponse
}

export function isAuthorized() {
  return !!tokenStore?.refreshToken
}

export function isTokenExpired() {
  if (!tokenStore?.updatedAt) {
    return true
  }
  return Date.now() >= tokenStore.updatedAt + tokenStore.expiresIn * 1000;
}
