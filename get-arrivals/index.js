module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (req.query.stopId) {
        try {
            context.res = {
                body: JSON.stringify(await getOTPStopTimes(req.query.stopId)),
            }
        } catch (error) {
            context.res = {
                status: 500,
            }
        }
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass a stopId on the query string"
        };
    }
};

const OTP_BASE_URL = 'https://otp.metroservices.io/otp';

const getOTPStopTimes = async (stopId) => {
    // return {};
    const request = new Request(`${OTP_BASE_URL}/routers/default/index/stops/${stopId}/stoptimes/`, {
        body: new URLSearchParams([
            ['omitNonPickups', 'true'],
            ['numberOfDepartures', '2'],
        ])
    })
    const response = await fetch(request);
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    const otpStopTimes = await response.json();
    return otpStopTimes;
}