import { mixpanel, THREEDSACSCHALLENGEURL_STEP2_REQ, THREEDSMETHODURL_STEP1_REQ } from './mixpanelHelperInit';

function createForm(formName, formAction, formTarget, inputs) {
  const form: HTMLFormElement = Object.assign(document.createElement('form'), {
    name: formName,
    action: formAction,
    method: 'POST',
    target: formTarget,
  });

  form.setAttribute('style', 'display:none');
  for (const [name, value] of Object.entries(inputs)) {
    form.appendChild(
      Object.assign(document.createElement('input'), {
        name,
        value,
      }),
    );
  }

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

export function start3DS2MethodStep(threeDSMethodUrl, threeDSMethodData, myIFrame) {
  // container should be an iframe
  mixpanel.track(THREEDSMETHODURL_STEP1_REQ.value, {
    EVENT_ID: THREEDSMETHODURL_STEP1_REQ.value,
  });
  const html = document.createElement('html');
  const body = document.createElement('body');
  const form = createForm('threeDSMethodForm', threeDSMethodUrl, myIFrame.name, {
    threeDSMethodData,
  });

  body.appendChild(form);
  html.appendChild(body);
  myIFrame.appendChild(html);
  myIFrame.setAttribute('style', 'display:none');

  form.submit();

  return myIFrame;
}

export function start3DS2AcsChallengeStep(acsUrl, params, container) {
  mixpanel.track(THREEDSACSCHALLENGEURL_STEP2_REQ.value, {
    EVENT_ID: THREEDSACSCHALLENGEURL_STEP2_REQ.value,
    acsUrl, // TODO: To be removed for privacy?
  });
  const form = createForm('acsChallengeForm', acsUrl, '_self', params);
  container.appendChild(form);
  form.submit();
}
