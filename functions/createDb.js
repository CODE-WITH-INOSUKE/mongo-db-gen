const crypto = require('crypto');
const config = require("../config.json")

async function apiFetch(url, { method = 'GET', body, username, password } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const bodyStr = body ? JSON.stringify(body) : undefined;

  const res = await fetch(url, { method, headers, body: bodyStr });

  if (res.status === 401) {
    const wwwAuth = res.headers.get('www-authenticate');
    if (!wwwAuth) throw new Error('Expected 401 with WWW-Authenticate header');

    const params = {};
    const raw = wwwAuth.replace(/^Digest\s+/i, '');
    for (const part of raw.split(',')) {
      const match = part.trim().match(/^(\w+)\s*=\s*"([^"]*)"$/);
      if (match) {
        params[match[1]] = match[2];
      } else {
        const match2 = part.trim().match(/^(\w+)\s*=\s*(\S+)$/);
        if (match2) params[match2[1]] = match2[2];
      }
    }

    const uri = new URL(url).pathname;
    const cnonce = Math.random().toString(36).substring(2, 10);
    const ha1 = crypto.createHash('md5').update(`${username}:${params.realm}:${password}`).digest('hex');
    const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');

    let response;
    if (params.qop) {
      response = crypto.createHash('md5').update(`${ha1}:${params.nonce}:00000001:${cnonce}:${params.qop}:${ha2}`).digest('hex');
    } else {
      response = crypto.createHash('md5').update(`${ha1}:${params.nonce}:${ha2}`).digest('hex');
    }

    let digest = `Digest username="${username}", realm="${params.realm}", nonce="${params.nonce}", uri="${uri}", response="${response}"`;
    if (params.qop) digest += `, qop=${params.qop}, nc=00000001, cnonce="${cnonce}"`;
    if (params.opaque) digest += `, opaque="${params.opaque}"`;

    const authRes = await fetch(url, {
      method,
      headers: { ...headers, Authorization: digest },
      body: bodyStr,
    });

    if (!authRes.ok) {
      const text = await authRes.text();
      throw new Error(`Atlas API ${authRes.status}: ${text}`);
    }

    return authRes;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Atlas API ${res.status}: ${text}`);
  }

  return res;
}

async function createDB(projectName, authToken, public_key) {
  const res = await apiFetch('https://cloud.mongodb.com/api/atlas/v1.0/groups', {
    method: 'POST',
    username: public_key,
    password: authToken,
    body: { name: projectName, orgId: config.org_Id }
  });
  const data = await res.json();
  return data.id;
}

function addWl(projectId, authToken, public_key, ipWhitelist) {
  return apiFetch(`https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/accessList`, {
    method: 'POST',
    username: public_key,
    password: authToken,
    body: [{ ipAddress: ipWhitelist, comment: "test" }]
  });
}

function createUser(projectId, authToken, public_key, username, password) {
  return apiFetch(`https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/databaseUsers`, {
    method: 'POST',
    username: public_key,
    password: authToken,
    body: {
      databaseName: "admin",
      username,
      password,
      roles: [{ databaseName: "admin", roleName: "atlasAdmin" }]
    }
  });
}

function createCluster(projectId, authToken, public_key) {
  return apiFetch(`https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/clusters`, {
    method: 'POST',
    username: public_key,
    password: authToken,
    body: {
      name: "Cluster0",
      diskSizeMB: 512,
      numShards: 1,
      mongoDBMajorVersion: "5.0",
      providerSettings: {
        providerName: "TENANT",
        regionName: "US_EAST_1",
        backingProviderName: "AWS",
        instanceSizeName: "M0",
      }
    }
  });
}

function generateConnectionString(projectId, authToken, public_key, username, password) {
  return new Promise((resolve, reject) => {
    const checkClusterState = setInterval(async () => {
      try {
        const res = await apiFetch(`https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/clusters/Cluster0`, {
          method: 'GET',
          username: public_key,
          password: authToken,
        });
        const data = await res.json();

        if (data.stateName !== "CREATING") {
          clearInterval(checkClusterState);
          const srv = data.srvAddress;
          const credentials = `${username}:${password}@`;
          const connectionString = srv.split("//")[0] + "//" + credentials + srv.split("//")[1] + "/?retryWrites=true&w=majority";
          resolve(connectionString);
        }
      } catch (err) {
        clearInterval(checkClusterState);
        reject(err);
      }
    }, 60000);
  });
}

async function createAll(projectName, authToken, public_key, ipWhitelist, username, password) {
  const projectId = await createDB(projectName, authToken, public_key);
  await createCluster(projectId, authToken, public_key);
  await createUser(projectId, authToken, public_key, username, password);
  await addWl(projectId, authToken, public_key, ipWhitelist);
  const connectionString = await generateConnectionString(projectId, authToken, public_key, username, password);
  return connectionString;
}

module.exports = { createAll }
