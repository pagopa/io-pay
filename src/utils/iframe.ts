function createForm(formName, formAction, formTarget, inputName, inputValue) {
  const form: HTMLFormElement = Object.assign(document.createElement('form'), {
    name: formName,
    action: formAction,
    method: 'POST',
    target: formTarget,
  });

  form.setAttribute('style', 'display:none');

  const myInput: HTMLInputElement = Object.assign(document.createElement('input'), {
    name: inputName,
    value: inputValue,
  });

  form.appendChild(myInput);

  return form;
}

export function createIFrame(container, id, name) {
  const iframe = document.createElement('iframe');

  iframe.setAttribute('id', id);
  iframe.setAttribute('name', name);
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('border', '0');
  iframe.setAttribute('style', 'overflow:hidden; position:absolute');

  container.appendChild(iframe);

  return iframe;
}

// start3ds2AuthStep(url, data: string, myIFrame | window, visible:bool)

export function start3DS2MethodStep(threeDSMethodUrl, threeDSMethodData, myIFrame) {
  // container should be an iframe
  const html = document.createElement('html');
  const body = document.createElement('body');
  const form = createForm('threeDSMethodForm', threeDSMethodUrl, myIFrame.name, 'threeDSMethodData', threeDSMethodData);

  body.appendChild(form);
  html.appendChild(body);
  myIFrame.appendChild(html);
  myIFrame.setAttribute('style', 'display:none');

  form.submit();

  return myIFrame;
}
/*
init3DSChallengeRequest = function init3DSChallengeRequest(acsUrl, creqData, container) {
  if (!acsUrl || !creqData || !container) {
    throw Error('Not all required fields have value');
  }
  if (container instanceof HTMLIFrameElement === false) {
    throw Error('Container is not of type iframe');
  }
  if (!container.name) {
    throw Error('Container must have a name attribute');
  }

  var html = document.createElement('html');
  var body = document.createElement('body');
  var form = nca3DSWebSDK.createForm('challengeRequestForm', acsUrl, container.name, 'creq', creqData);

  body.appendChild(form);
  html.appendChild(body);
  container.appendChild(html);

  form.submit();

  return container;
};

nca3DSWebSDK.prototype.createIframeAndInit3DSMethod = function createIframeAndInit3DSMethod(
  threeDSMethodUrl,
  threeDSMethodData,
  frameName,
  rootContainer,
  onFrameLoadCallback,
) {
  var iFrame = nca3DSWebSDK.createIFrame(
    rootContainer,
    frameName,
    'threeDSMethodIframe',
    '0',
    '0',
    onFrameLoadCallback,
  );
  nca3DSWebSDK.init3DSMethod(threeDSMethodUrl, threeDSMethodData, iFrame);
  return iFrame;
};

nca3DSWebSDK.prototype.createIFrameAndInit3DSChallengeRequest = function createIFrameAndInit3DSChallengeRequest(
  acsUrl,
  creqData,
  challengeWindowSize,
  frameName,
  rootContainer,
  onFrameLoadCallback,
) {
  var windowSize = nca3DSWebSDK.getWindowSize(challengeWindowSize);
  var iFrame = nca3DSWebSDK.createIFrame(
    rootContainer,
    frameName,
    'threeDSCReqIframe',
    windowSize[0],
    windowSize[1],
    onFrameLoadCallback,
  );
  nca3DSWebSDK.init3DSChallengeRequest(acsUrl, creqData, iFrame);
  return iFrame;
};


window.nca3DSWebSDK = new nca3DSWebSDK();
// END SNIPPET: websdk-documentation
*/
