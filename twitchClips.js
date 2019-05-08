// https://dev.twitch.tv/
// https://developer.twitter.com/


// NOTE** Delays are currently being used in specific locations
// due to limitations in the Twitch API

const fs = require('fs');
const TwitchClient = require('twitch').default;
const Twit = require('twit');
const env = require('dotenv').config();
const axios = require('axios');

const clientId = process.env.TID;
let accessToken;
let client;

const viewRequirement = Number(250);
const delayTimer = Number(2000); // 2 seconds
const postTimer = Number(1000 * 60 * 5); // 5 mins
const getClipTimer = Number(1000 * 60 * 60 * 2); // 2 hours
const fileName = 'url.log';

const gameNames = ['Just Chatting', 'Old School RuneScape', 'PLAYERUNKNOWN\'S BATTLEGROUNDS', 'League of Legends', 'Fortnite', 'Grand Theft Auto V', 'Path of Exile', 'World of Warcraft', 'Counter-Strike: Global Offensive', 'Dota 2', 'Apex Legends', 'Overwatch', 'Street Fighter V', 'Hearthstone', 'Tom Clancy\'s Rainbow Six: Siege'];

const T = new Twit({
  consumer_key: process.env.CKEY,
  consumer_secret: process.env.CKEYS,
  access_token: process.env.ATKN,
  access_token_secret: process.env.ATKNS,
  timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
  strictSSL: true, // optional - requires SSL certificates to be valid.
});

// returns promise after 'ms' time.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// appends array to the end of a file
const appToFile = (file, array) => {
  fs.appendFile(file, array, (err) => {
    if (err) throw (err);
  });
};

// overwrites current contents of a file with array
const writeToFile = (file, array) => {
  fs.writeFileSync(file, array, (err) => {
    if (err) throw (err);
  });
};


// requests collections of twitch.tv clips, sorts them and saves to a local log
const getClip = async (id) => {
  await delay(delayTimer);

  const clipURLArray = [];

  const now = new Date(Date.now()).toISOString();
  const minus2Hour = new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString();

  const clips = client.helix.clips.getClipsForGame(id, { endDate: now, startDate: minus2Hour });
  const allClips = await clips.getAll();

  allClips.forEach((clip) => {
    if (clip.views >= viewRequirement) {
      clipURLArray.push(clip.url);
    }
  });

  if (clipURLArray.length > 0) {
    clipURLArray[clipURLArray.length - 1] = `${clipURLArray[clipURLArray.length - 1]},`;
    appToFile(fileName, clipURLArray);
  }
};

// converts the game array into ID's that the twitch API can use
const getGameID = async (name) => {
  client = await TwitchClient.withCredentials(clientId, accessToken);
  await delay(delayTimer);
  await client.helix.games.getGameByName(name, client).then((response) => {
    getClip(response.id);
  });
};

// loops the game array and sends to getGameID()
const getClips = async () => {
  for (let x = 0; x < gameNames.length; x += 1) {
    getGameID(gameNames[x]);
    await delay(delayTimer);
  }
};


// Get clips from gameNames array every 2 hours
const getClipsInterval = getClipTimer;
setInterval(() => {
  getClips();
}, getClipsInterval);


// error handleing call back function for tweeting
const tweeted = (err, data, response) => {
  if (err) {
    console.log(`${err} ### ${data}`);
  }
};


// posts a new tweet every 5 mins from the log file
const postClips = postTimer; // 5 mins
setInterval(() => {
  fs.readFile(fileName, (err, data) => {
    if (err);

    const array = data.toString().split(',');
    const line = Math.floor(Math.random() * Math.floor(array.length));
    const clipLine = array[line];

    array.splice(line, 1);

    if (clipLine !== '') {
      T.post('statuses/update', { status: clipLine }, tweeted);
    }

    writeToFile(fileName, array);
  });
}, postClips);


// sends a post request to twitchs API to receive an up to date token
const getTwitchToken = async () => {
  axios.post(process.env.TOKENPOST, {
  })
    .then((res) => {
      accessToken = res.data.access_token;
      getClips();
    })
    .catch((error) => {
      console.error(error);
    });
};

getTwitchToken();

// timer to get new tokens to ensure its never expired
const getTokenInterval = (1000 * 60 * 60 * 48); // 2 days
setInterval(() => {
  getTwitchToken();
}, getTokenInterval);
