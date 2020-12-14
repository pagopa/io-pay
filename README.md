
# io-pay
- [io-pay](#io-pay)
  - [Prerequisites](#prerequisites)
  - [Running](#running)
  
Is a [WISP](https://docs.italia.it/italia/pagopa/pagopa-specifichepagamenti-docs/it/stabile/_docs/SANP_2.2_Sez2_Cap06_ComponentiTecnicheNodo.html#componente-wisp) replacement project and it will be the first web interface to allow guest (_citizen_) payment of [pagoPa](https://www.pagopa.gov.it/) system.

## Prerequisites

- [yarn](https://classic.yarnpkg.com/en/docs/getting-started)

## Running

Run the following commands in your console :
```sh
yarn install
yarn start
```

then open browser [here](http://localhost:1234/index.html?p=12345)

You should now see something like the following 👍

![](./doc/2020-11-20-18-45-33.png)

## Live environment

Staging environment is [here](https://io-p-cdnendpoint-iopay.azureedge.net/index.html?p=433)
