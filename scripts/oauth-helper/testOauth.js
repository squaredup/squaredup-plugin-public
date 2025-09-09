import express from 'express';
import path from 'path';
import { loadJsonFromFile, loadOAuthHandler, savePatches } from './util.js';

/*
This script acts as a test harness for OAuth
It expects that you are going to give it a plugin path via the command line and that 
    the plugin has a valid testConfig.json file configured.

e.g. node .\testOauth.js -p C:\Users\SomeUser\source\SquaredUp\squaredup-plugin-repository\plugins\Azure\v2 
e.g. node ..\..\..\scripts\oauth-helper\testOauth.js --plugin ./
e.g. node --inspect ..\..\..\scripts\oauth-helper\testOauth.js -p ./

Additionally it expects that any environment variables that are normally set in the cloud environment 
    have been set appropriately.

e.g. $env:OAUTH_CLIENT_ID = 'someValue'
e.g. $env:SQUP_PLUGIN_SECRETS = 'list of values'

You will then be expected to navigate to http://localhost:80 via a browser to initiate the test and sign in.

Any logs will be recorded to the oauth_test_results folder of the given plugin's directory.

On successful authentication the testConfig.json file will be updated with whatever the plugin would normally patch in.
This means that, after success, validate.js or testDatastreams.js can be used with OAuth configuration.
*/

const args = process.argv;
let pluginPath = './';

// Must be 80 to match redirect logic in prod oAuth clients
// e.g. in the real world we allow http://localhost/settings/pluginsoauth2,
//     https://app.squaredup.com/settings/pluginsoauth2, etc., etc.
const port = 80;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--plugin') {
        pluginPath = path.resolve(args[i + 1]);
    }
}

if (process.env.SQUP_PLUGIN_SECRETS) {
    const metadataPath = path.join(pluginPath, 'metadata.json');
    const metadata = loadJsonFromFile(metadataPath);
    const parsedName = metadata.name.toLowerCase().replace(' ', '-');

    const secrets = JSON.parse(process.env.SQUP_PLUGIN_SECRETS);

    if (secrets[parsedName]) {
        const secret = secrets[parsedName];

        secret.forEach((entry) =>
            Object.entries(entry).forEach(([key, value]) => {
                process.env[key] = value;
            })
        );
    }
}

if (!process.env.OAUTH_CLIENT_ID) {
    console.warn('OAUTH_CLIENT_ID not set in environment. This may cause issues.');
}

if (!process.env.OAUTH_CLIENT_SECRET) {
    console.warn('OAUTH_CLIENT_SECRET not set in environment. This may cause issues.');
}

const app = express();

const { oAuth2Begin, oAuth2CodeResponse } = await loadOAuthHandler(pluginPath);

app.get('/', (req, res) => {
    res.send('<p><a href="/auth">Sign in</a></p>');
});

app.get('/auth', async (req, res) => {
    const redirect = 'http://localhost/settings/pluginsoauth2';

    const url = await oAuth2Begin(redirect);

    // console.log(`oAuthBegin returns url: '${url}'`);
    console.log('Response from plugin');

    res.redirect(url);
});

// bodge to deal with fragments rather than query arguments sent by Microsoft
// Fragments only land in the browser
// https://stackoverflow.com/questions/33667003/parse-url-hash-fragment-in-express-application
// Ideally we would just deal with either case right here.
app.get('/settings/pluginsoauth2', async (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
    <body>
        <script>
            const redirect = '/settings/query?';

            const hash = decodeURIComponent(window.location.hash).substring(1);

            const searchParams = new URLSearchParams(window.location.search);

            if (hash) {
                hash.split('&').forEach(keyValuePair => {
                    // Only split first = (there might be more if the value part is Base64 encoded)
                    const i = keyValuePair.indexOf('=');
                    const [key, value] = [keyValuePair.substring(0,i), keyValuePair.substring(i+1)];

                    searchParams.set(key, value);
                });
            }
            
            window.location.replace(redirect + searchParams.toString());
        </script>
    </body>
</html>
    `);
});

app.get('/settings/query', async (req, res) => {
    console.log('Response from remote');

    const { query } = req;

    const { response, lastPatch } = await oAuth2CodeResponse(query);

    const home = '</br><p><a href="/">Restart Process</a></p>';

    if (!response) {
        res.send(`
            <p>🔥😵 Plugin reports total failure! 😵🔥</p>
            ${home}
        `);
    } else if (Array.isArray(lastPatch.errors) && lastPatch.errors.length !== 0) {
        const errors = lastPatch.errors.map((e) => `<p>${e}</p>`);

        res.send(`
            <p>⛔😩 Plugin reports failure to convert token! 😩⛔</p>
            ${errors.join('\n')}
            <p>LoginStatus: ${lastPatch.loginStatus}</p>
            ${home}
        `);
    } else {
        savePatches(pluginPath);

        res.send(`
            <p>🟢🎉 Plugin reports success converting to token! 🎉🟢</p>
            <p>LoginStatus: ${lastPatch.loginStatus}</p>
            ${home}
        `);
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}. Visit http://localhost:${port}`);
});
