// I'm maintaining all active connections in this object
const clients = {};

// Generates unique userid for every user.
const generateUniqueID = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + '-' + s4() + '-' + s4();
};

const { WebsocketClient, DefaultLogger } = require('okx-api');

const logger = {
  ...DefaultLogger,
};

// read from environmental variables
const API_KEY = process.env.OKX_API_KEY;
const API_SECRET = process.env.OKX_API_SECRET;
const API_PASS = process.env.OKX_API_PASSPHRASE;

if (!API_KEY || !API_SECRET || !API_PASS) {
  throw new Error(
    `Missing api credentials. Use environmental variables or hard code in the script`
  );
}

const wsClient = new WebsocketClient(
  {
    accounts: [
      {
        apiKey: API_KEY,
        apiSecret: API_SECRET,
        apiPass: API_PASS,
      }
    ]
  },
  logger
);

// Raw data will arrive on the 'update' event
wsClient.on('update', (data) => {
  // console.log('ws update (raw data received)', JSON.stringify(data, null, 2));
  console.log('ws update (raw data received)', JSON.stringify(data));
});
wsClient.on('open', (data) => {
  console.log('connection opened open:', data.wsKey);
});
// Replies (e.g. authenticating or subscribing to channels) will arrive on the 'response' event
wsClient.on('response', (data) => {
  // console.log('ws response: ', JSON.stringify(data, null, 2));
  console.log('ws response: ', JSON.stringify(data));
});
wsClient.on('reconnect', ({ wsKey }) => {
  console.log('ws automatically reconnecting.... ', wsKey);
});
wsClient.on('reconnected', (data) => {
  console.log('ws has reconnected ', data?.wsKey);
});
wsClient.on('error', (data) => {
  console.error('ws exception: ', data);
});

module.exports = wsServer => {

  wsServer.on('request', function (request) {
    var userID = generateUniqueID();
    console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
    // You can rewrite this part of the code to accept only the requests from allowed origin
    const connection = request.accept(null, request.origin);
    clients[userID] = connection;
    console.log('connected: ' + userID);

    connection.on('close', function (connection) {
      delete clients[userID];
    });
  });
}