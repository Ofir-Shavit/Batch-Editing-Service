import express, {Request} from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import {RequestBody} from './types';
import {batchRequests} from './service';
import config from './config';

const app = express();

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post('/batch', async (req: Request<any, any, RequestBody, any>, res) => {

    let {endpoint, payloads} = req.body;

    const results = await batchRequests(endpoint, payloads);

    res.json(results);

});

const port = config.port;

app.listen(port, () => {
    console.log(`App is listening on port ${port}!`);
});