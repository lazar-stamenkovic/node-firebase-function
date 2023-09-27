import * as firebaseAdmin from "firebase-admin";

const serviceAccount = require("../transax-integrations-hubspot.json");
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

export function saveHubSpotToken(token: any) {
  return firebaseAdmin.firestore().collection('hubspot').doc('tokens').set(JSON.parse(JSON.stringify(token)))
}

export function getHubSpotToken() {
  return firebaseAdmin.firestore().collection('hubspot').doc('tokens').get().then(doc => {
    return doc && doc.data()
  })
}

export function saveTicket(ticket: any) {
  return  firebaseAdmin.firestore().collection('tickets').doc().set(JSON.parse(JSON.stringify(ticket)))
}

export function getTicketByIntercomTicketId(intercom_ticket_id: string) {
  return firebaseAdmin.firestore().collection('tickets').where("intercom_ticket_id", "==", intercom_ticket_id).get().then(res => {
    const documents = res.docs.map((doc) => doc.data());
    return documents && documents.length > 0 && documents[0]
  })
}