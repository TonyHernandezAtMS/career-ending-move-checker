module.exports = function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (!req.body || !req.body.text) {
        context.res = {
            status: 400,
            body: "Please pass a text string in the request body"
        };
        context.done();
        return;
    }

    const processText = require('./processText');

    return processText(req.body.text)
        .then(function (response) {
            context.res = {
                // status: 200, /* Defaults to 200 */
                body: response
            };
        })
        .catch(function (reason) {
            console.log(reason);
            context.res = {
                status: 500,
                body: {
                    message:"Error on server",
                    responseData: reason.response.data,
                    requestPath: reason.request.path,
                    stacktrace: reason.stack
                }
            };
        })

}
