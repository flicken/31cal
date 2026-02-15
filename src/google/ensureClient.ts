function waitForGapi(timeoutMs = 10000): Promise<any> {
  const gapi = (window as any).gapi;
  if (gapi) return Promise.resolve(gapi);

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const gapi = (window as any).gapi;
      if (gapi) {
        clearInterval(interval);
        resolve(gapi);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(
          new Error(
            'Timed out waiting for Google API (gapi) to load. Ensure the gapi script is included.',
          ),
        );
      }
    }, 50);
  });
}

const ensureClient = async () => {
  console.log('Ensuring client');
  const gapi = await waitForGapi();
  console.log('gapi', gapi);

  const initClient = () => {
    return gapi.client.init({
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
      ],
    });
  };

  if (!gapi.client) {
    await new Promise<void>((resolve, reject) => {
      try {
        gapi.load('client', resolve);
      } catch (e) {
        reject(e);
      }
    });
    await initClient();
  } else {
    await initClient();
  }
};

export default ensureClient;
