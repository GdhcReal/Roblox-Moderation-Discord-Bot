const baseurl = 'https://apis.roblox.com/cloud/v2';
const usersurl = 'https://users.roblox.com/v1';

function getheaders() {
  return {
    'x-api-key': process.env.robloxKey,
    'Content-Type': 'application/json',
  };
}

function getuniverseid() {
  const id = process.env.universeId;
  if (!id) throw new Error('universeId is not set in .env');
  return id;
}

async function resolveusernametoid(username) {
  const res = await fetch(`${usersurl}/usernames/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });

  if (!res.ok) throw new Error(`Roblox Users API error: ${res.status}`);

  const data = await res.json();
  const user = data.data?.[0];
  if (!user) throw new Error(`User not found: "${username}"`);
  return String(user.id);
}

async function getrobloxuser(target) {
  const userid = /^\d+$/.test(target) ? target : await resolveusernametoid(target);

  const [userres, thumbres] = await Promise.all([
    fetch(`https://users.roblox.com/v1/users/${userid}`),
    fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userid}&size=420x420&format=png&isCircular=false`),
  ]);

  let username    = target;
  let displayname = target;
  if (userres.ok) {
    const userdata = await userres.json();
    username    = userdata.name        || target;
    displayname = userdata.displayName || username;
  }

  let avatar = null;
  if (thumbres.ok) {
    const thumbdata = await thumbres.json();
    avatar = thumbdata?.data?.[0]?.imageUrl || null;
  }

  return {
    userid,
    username,
    displayname,
    avatar,
    profileurl: `https://rbx.how/user/${userid}`,
  };
}

async function getgamename(universeid) {
  try {
    const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeid}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.name || null;
  } catch {
    return null;
  }
}

async function banplayer(userid, reason, durationseconds = null) {
  const universeid = getuniverseid();
  const restriction = {
    active: true,
    privateReason: reason,
    displayReason: reason,
    excludeAltAccounts: false,
  };

  if (durationseconds !== null) {
    restriction.duration = `${durationseconds}s`;
  }

  const url = `${baseurl}/universes/${universeid}/user-restrictions/${userid}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getheaders(),
    body: JSON.stringify({ gameJoinRestriction: restriction }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Failed to ban the user (${res.status}): ${text}`);

  return JSON.parse(text);
}

async function unbanplayer(userid) {
  const universeid = getuniverseid();

  const url = `${baseurl}/universes/${universeid}/user-restrictions/${userid}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getheaders(),
    body: JSON.stringify({ gameJoinRestriction: { active: false } }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Failed to unban the user (${res.status}): ${text}`);

  return JSON.parse(text);
}

async function getbanstatus(userid) {
  const universeid = getuniverseid();
  const url = `${baseurl}/universes/${universeid}/user-restrictions/${userid}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getheaders(),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Issue w ith checking a users ban status (${res.status}): ${text}`);

  return JSON.parse(text);
}

module.exports = {
  banPlayer: banplayer,
  unbanPlayer: unbanplayer,
  getBanStatus: getbanstatus,
  resolveUsernameToId: resolveusernametoid,
  getRobloxUser: getrobloxuser,
  getGameName: getgamename,
};