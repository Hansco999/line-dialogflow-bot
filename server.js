const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('line-messaging-api');
const dialogflow = require('@google-cloud/dialogflow');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const client = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
});

const sessionClient = new dialogflow.SessionsClient({
  keyFilename: '/etc/secrets/key.json'
});

app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events || [];
    const promises = events.map(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        const sessionPath = sessionClient.projectAgentSessionPath(
          'emonurse-kcqc',
          event.source.userId
        );

        const request = {
          session: sessionPath,
          queryInput: {
            text: {
              text: event.message.text,
              languageCode: 'en'
            }
          }
        };

        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;

        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: result.fulfillmentText
        });
      }
    });

    await Promise.all(promises);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
