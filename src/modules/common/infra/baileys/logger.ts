import pino, { multistream } from 'pino';
import * as stream from 'stream';

const bufferStream = new stream.PassThrough();

bufferStream.on('data', (chunk) => {
  try {
    const logData = JSON.parse(chunk.toString());
    const params = logData?.params ? logData?.params[0] : '';
    const msg = logData?.msg ? logData?.msg : '';
    console.log('❗', params, '|', msg);
  } catch (error: any) {
    console.log('❗', error.message);
  }
});

const logger = pino({}, multistream([{ stream: bufferStream }]));

export default logger;
