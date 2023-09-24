import * as hubspot from '@hubspot/api-client';
import * as logger from "firebase-functions/logger";
import * as firebaseAdmin from "firebase-admin";

const serviceAccount = require("../transax-integrations-hubspot.json");
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

let tokenStore: any
const hubspotClient = new hubspot.Client()
const GRANT_TYPES = {
  AUTHORIZATION_CODE: 'authorization_code',
  REFRESH_TOKEN: 'refresh_token',
};

export async function getTicketById(id: string) {
  await setAccessToken()
  const res = await hubspotClient.crm.tickets.basicApi.getById(id, ['subject', 'content', 'created_by', 'hs_ticket_priority'])
  return res
}

async function setAccessToken() {
  tokenStore = await firebaseAdmin.firestore().collection('hubspot').doc('tokens').get().then(doc => {
    return doc && doc.data()
  })
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
  await firebaseAdmin.firestore().collection('hubspot').doc('tokens').set(JSON.parse(JSON.stringify(tokenStore)))
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
  await firebaseAdmin.firestore().collection('hubspot').doc('tokens').set(JSON.parse(JSON.stringify(tokenStore)))
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
