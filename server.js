const express = require('express');
const { Issuer, custom } = require('openid-client');
const fs = require('fs');
const dotenv = require('dotenv');
const https = require('https');
const crypto = require('crypto');

const app = express();

dotenv.config();

const codeVerifier = crypto.randomBytes(32).toString('base64');
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64');

const initOpenIDClient = async () => {
  const issuer = await Issuer.discover(process.env.ISSUER);
  custom.setHttpOptionsDefaults({ timeout: 30000 });
  const client = new issuer.Client({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uris: [process.env.REDIRECT_URI],
    response_types: ['code'],
  });
  return client;
};

// const client = await initOpenIDClient();

app.get('/', (req, res) => {
  const state = 'random-state-value';
  const authorizationUrl = client.authorizationUrl({
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state:state
  });
  res.redirect(authorizationUrl);
});

app.get('/login.callback', async (req, res) => {
  const params = client.callbackParams(req);
  const state = params.state;
  const tokenSet = await client.callback(
    process.env.REDIRECT_URI,
    params,
    { code_verifier: codeVerifier, state },
  );
  // const { email, name } = tokenSet.claims();
  // res.send(`Welcome ${name} (${email})`);
  res.send(`Welcome ${JSON.stringify(params)}`);
});

// const PORT = process
let client = null;

const init = async () => {
  client = await initOpenIDClient();
  const PORT = process.env.PORT || 433;
  // app.listen(PORT, () => {
  //   console.log(`Server listening on port ${PORT}`);
  // });
  const options = {
    key: fs.readFileSync(process.env.KEY_PATH),
    cert: fs.readFileSync(process.env.CERT_PATH)
  };
  
  const server = https.createServer(options, app).listen(443, () => {
    console.log(`Server running on port ${server.address().port}`);
  });
};

init();