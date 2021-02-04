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
