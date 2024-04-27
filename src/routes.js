import{verifyGatewayRequest} from '../../9-jobber-shared/src/gateway-middleware.js'

const BASE_PATH = '/api/v1/message';

const appRoutes = (app)=>{
    // app.use('',verifyGatewayRequest,console.log('health routes'));
    // app.use(BASE_PATH,console.log('Chat routes'));
}

export{appRoutes};