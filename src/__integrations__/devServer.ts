import express from 'express';
import Bundler from 'parcel-bundler';

const app = express();

const entry = 'src/*.pug';
const bundle = new Bundler(entry, { watch: false });

app.use(bundle.middleware());

export default app;
