import fs from 'fs';

export const sessionTokenUnprocessableEntity = 'UnprocessableEntity';
export const sessionTokenInternalException = 'InternalException';

export const approveTermsResponseAccepted = {
  email: 'pippo@pluto.com',
  status: 'ANONYMOUS',
  acceptTerms: true, // accept
  notificationEmail: 'pippo@pluto.com',
  fiscalCode: 'HBBJUU78U89R556T',
  emailVerified: false,
  cellphoneVerified: false,
};

export const approveTermsResponseRefused = {
  email: 'pippo@pluto.com',
  status: 'ANONYMOUS',
  acceptTerms: false, // refuse
  notificationEmail: 'pippo@pluto.com',
  fiscalCode: 'HBBJUU78U89R556T',
  emailVerified: false,
  cellphoneVerified: false,
};

export const httpResponseStatus = {
  HTTP_400: 400, // Bad Request
  HTTP_401: 401, // Unauthorized
  HTTP_403: 403,
  HTTP_404: 404,
  HTTP_422: 422, // Unprocessable Entity
  HTTP_500: 500, // Internal Server Error
};

export const qrParams = {
  language: 'language',
};

// Add / remove validity to input elements
export function getTermAndServices(lang: string): string {
  try {
    return fs.readFileSync(`src/__mocks__/resources/terms/${lang}/termsAndConditions.txt`, {
      encoding: 'utf8',
      flag: 'r',
    });
  } catch (err) {
    return getTermAndServices('it');
  }
}

export function track(event_name: string, properties?: any): void {
  // eslint-disable-next-line no-console
  console.log(event_name, properties);
}
