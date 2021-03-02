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
  const form = createForm('acsChallengeForm', acsUrl, container.name, params);
  container.appendChild(form);
  form.submit();
}
