const ensureClient = () => {
  console.log('Ensuring client');
  const gapi: any = (window as any).gapi;
  const initClient = () => {
    return gapi.client.init({
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
      ],
    });
  };

  console.log('gapi', gapi);

  if (!gapi?.client) {
    const promise = new Promise(function (resolve, reject) {
      try {
        gapi.load('client', resolve);
      } catch (e) {
        reject(e);
      }
    });

    return promise.then(() => initClient());
  } else {
    return initClient();
  }
};

export default ensureClient;
